from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
from werkzeug.security import generate_password_hash, check_password_hash

# ✅ Your Postgres config (port 5433 as you confirmed)
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 5433,
    "dbname": "workhub",
    "user": "workhub_user",
    "password": "workhub123",
}

app = Flask(__name__)
CORS(app)


def db():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=psycopg2.extras.RealDictCursor)


def init_db():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('admin','owner','worker')),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      location TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS worker_profiles (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      skills TEXT DEFAULT '',
      experience_years INT DEFAULT 0,
      location TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','busy')),
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS business_workers (
      id SERIAL PRIMARY KEY,
      business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      worker_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(business_id, worker_user_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      worker_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stars INT NOT NULL CHECK(stars BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    conn.commit()

    # Seed admin
    cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1;")
    if cur.fetchone() is None:
        cur.execute("""
          INSERT INTO users(role, name, email, password_hash)
          VALUES(%s,%s,%s,%s)
        """, ("admin", "Admin", "admin@workhub.local", generate_password_hash("admin123")))
        conn.commit()

    cur.close()
    conn.close()


# ---------- Health ----------
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "workhub", "db_port": DB_CONFIG["port"]})


# ---------- Auth ----------
@app.post("/api/register")
def register():
    data = request.get_json(force=True)
    role = (data.get("role") or "").strip().lower()
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if role not in ("owner", "worker"):
        return jsonify({"ok": False, "error": "Role must be owner or worker"}), 400
    if not name or not email or len(password) < 4:
        return jsonify({"ok": False, "error": "Name, email and password (min 4 chars) required"}), 400

    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
          INSERT INTO users(role,name,phone,email,password_hash)
          VALUES(%s,%s,%s,%s,%s)
          RETURNING id, role, name, email;
        """, (role, name, phone, email, generate_password_hash(password)))
        user = cur.fetchone()

        if role == "worker":
            cur.execute("""
              INSERT INTO worker_profiles(user_id) VALUES(%s);
            """, (user["id"],))

        conn.commit()
        return jsonify({"ok": True, "user": user})

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"ok": False, "error": "Email already exists"}), 409
    finally:
        cur.close()
        conn.close()


@app.post("/api/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT id, role, name, email, password_hash FROM users WHERE email=%s;", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "error": "Invalid email/password"}), 401

    return jsonify({"ok": True, "user": {"id": user["id"], "role": user["role"], "name": user["name"], "email": user["email"]}})


# ---------- Owner: create business ----------
@app.post("/api/owner/businesses")
def owner_create_business():
    data = request.get_json(force=True)
    owner_id = data.get("owner_id")
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "").strip()
    location = (data.get("location") or "").strip()

    if not owner_id or not name:
        return jsonify({"ok": False, "error": "owner_id and business name required"}), 400

    conn = db()
    cur = conn.cursor()

    # verify owner role
    cur.execute("SELECT id FROM users WHERE id=%s AND role='owner';", (owner_id,))
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return jsonify({"ok": False, "error": "Invalid owner_id"}), 403

    cur.execute("""
      INSERT INTO businesses(owner_id, name, category, location)
      VALUES(%s,%s,%s,%s)
      RETURNING *;
    """, (owner_id, name, category, location))
    business = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True, "business": business})


# ---------- Public: list businesses ----------
@app.get("/api/businesses")
def list_businesses():
    conn = db()
    cur = conn.cursor()
    cur.execute("""
      SELECT b.*, u.name AS owner_name
      FROM businesses b
      JOIN users u ON u.id=b.owner_id
      ORDER BY b.id DESC;
    """)
    items = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"ok": True, "items": items})


# ---------- Worker: update profile ----------
@app.post("/api/worker/profile")
def worker_update_profile():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    skills = (data.get("skills") or "").strip()
    experience_years = int(data.get("experience_years") or 0)
    location = (data.get("location") or "").strip()

    if not user_id:
        return jsonify({"ok": False, "error": "user_id required"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE id=%s AND role='worker';", (user_id,))
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return jsonify({"ok": False, "error": "Invalid worker user_id"}), 403

    cur.execute("""
      UPDATE worker_profiles
      SET skills=%s, experience_years=%s, location=%s
      WHERE user_id=%s
      RETURNING *;
    """, (skills, experience_years, location, user_id))
    profile = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True, "profile": profile})


# ---------- Worker: change availability status ----------
@app.post("/api/worker/status")
def worker_set_status():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    status = (data.get("status") or "").strip().lower()

    if status not in ("pending", "ready", "busy"):
        return jsonify({"ok": False, "error": "status must be pending/ready/busy"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("""
      UPDATE worker_profiles SET status=%s
      WHERE user_id=%s
      RETURNING user_id, status;
    """, (status, user_id))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"ok": False, "error": "worker not found"}), 404
    return jsonify({"ok": True, "worker": row})


# ---------- Worker: register under a business (pending) ----------
@app.post("/api/worker/register_business")
def worker_register_business():
    data = request.get_json(force=True)
    worker_user_id = data.get("worker_user_id")
    business_id = data.get("business_id")

    if not worker_user_id or not business_id:
        return jsonify({"ok": False, "error": "worker_user_id and business_id required"}), 400

    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE id=%s AND role='worker';", (worker_user_id,))
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return jsonify({"ok": False, "error": "Invalid worker_user_id"}), 403

    cur.execute("SELECT id FROM businesses WHERE id=%s;", (business_id,))
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return jsonify({"ok": False, "error": "Invalid business_id"}), 404

    try:
        cur.execute("""
          INSERT INTO business_workers(business_id, worker_user_id, approved)
          VALUES(%s,%s,FALSE)
          RETURNING *;
        """, (business_id, worker_user_id))
        row = cur.fetchone()
        conn.commit()
        return jsonify({"ok": True, "request": row})
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"ok": False, "error": "Already requested/registered"}), 409
    finally:
        cur.close()
        conn.close()


# ---------- Owner: view pending requests for their businesses ----------
@app.get("/api/owner/pending_requests")
def owner_pending_requests():
    owner_id = request.args.get("owner_id")
    if not owner_id:
        return jsonify({"ok": False, "error": "owner_id required"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("""
      SELECT bw.id as request_id, bw.business_id, b.name as business_name,
             bw.worker_user_id, u.name as worker_name, u.phone, u.email,
             bw.approved, bw.created_at
      FROM business_workers bw
      JOIN businesses b ON b.id=bw.business_id
      JOIN users u ON u.id=bw.worker_user_id
      WHERE b.owner_id=%s AND bw.approved=FALSE
      ORDER BY bw.created_at DESC;
    """, (owner_id,))
    items = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"ok": True, "items": items})


# ---------- Owner: approve worker request ----------
@app.post("/api/owner/approve_request")
def owner_approve_request():
    data = request.get_json(force=True)
    owner_id = data.get("owner_id")
    request_id = data.get("request_id")

    if not owner_id or not request_id:
        return jsonify({"ok": False, "error": "owner_id and request_id required"}), 400

    conn = db()
    cur = conn.cursor()

    # Make sure the request belongs to this owner's business
    cur.execute("""
      SELECT bw.id
      FROM business_workers bw
      JOIN businesses b ON b.id=bw.business_id
      WHERE bw.id=%s AND b.owner_id=%s;
    """, (request_id, owner_id))
    if cur.fetchone() is None:
        cur.close(); conn.close()
        return jsonify({"ok": False, "error": "Not allowed"}), 403

    cur.execute("""
      UPDATE business_workers
      SET approved=TRUE
      WHERE id=%s
      RETURNING id, approved;
    """, (request_id,))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True, "updated": row})


# ---------- Public: list workers (filter by status + business) ----------
@app.get("/api/workers")
def list_workers():
    status = (request.args.get("status") or "").strip().lower()
    business_id = request.args.get("business_id")

    where = ["u.role='worker'"]
    params = []

    if status in ("pending", "ready", "busy"):
        where.append("wp.status=%s")
        params.append(status)

    join_bw = ""
    if business_id:
        join_bw = """
          JOIN business_workers bw
            ON bw.worker_user_id=u.id
           AND bw.business_id=%s
           AND bw.approved=TRUE
        """
        params = [business_id] + params

    query = f"""
      SELECT u.id as user_id, u.name, u.phone, u.email,
             wp.skills, wp.experience_years, wp.location, wp.status,
             COALESCE(ROUND(AVG(r.stars)::numeric, 1), 0) as avg_rating,
             COUNT(r.id) as rating_count
      FROM users u
      JOIN worker_profiles wp ON wp.user_id=u.id
      LEFT JOIN ratings r ON r.worker_user_id=u.id
      {join_bw}
      WHERE {" AND ".join(where)}
      GROUP BY u.id, wp.id
      ORDER BY avg_rating DESC, u.id DESC;
    """

    conn = db()
    cur = conn.cursor()
    cur.execute(query, tuple(params))
    items = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"ok": True, "items": items})


# ---------- Rate a worker ----------
@app.post("/api/rate")
def rate_worker():
    data = request.get_json(force=True)
    worker_user_id = data.get("worker_user_id")
    stars = int(data.get("stars") or 0)
    comment = (data.get("comment") or "").strip()

    if not worker_user_id or stars < 1 or stars > 5:
        return jsonify({"ok": False, "error": "worker_user_id and stars(1-5) required"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute("""
      INSERT INTO ratings(worker_user_id, stars, comment)
      VALUES(%s,%s,%s)
      RETURNING *;
    """, (worker_user_id, stars, comment))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True, "rating": row})


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5001, debug=True)
