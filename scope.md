# WorkHub – Project Scope

## 1. Scope Introduction

This document defines the scope of the WorkHub project. It clearly outlines what is included in the system and what is intentionally kept out of the current phase. This helps in setting correct expectations for development, testing, and deployment.

---

## 2. In-Scope Features

### 2.1 User Management

* Registration and login for workers and business owners
* Admin login with elevated privileges
* Role-based access control

### 2.2 Business Management

* Admin can create, update, and remove businesses
* Business owners can manage multiple businesses
* Each business maintains its own worker list

### 2.3 Worker Registration and Profiles

* Workers can register under specific businesses
* Profiles include:

  * Skills
  * Experience
  * Location
  * Availability status
  * About section

### 2.4 Approval Workflow

* Worker registrations start as "pending"
* Admin or business owner approves workers
* Status transitions: pending → ready → busy

### 2.5 Browsing and Discovery

* Users can browse businesses
* View workers business-wise
* Filter workers based on availability

### 2.6 Ratings and Feedback

* Users can rate workers
* Average ratings displayed on worker profiles

---

## 3. Out-of-Scope Features (Current Phase)

The following features are intentionally excluded from the current version:

* Online payments
* Chat or messaging system
* GPS-based live tracking
* Background verification
* Mobile application

These features may be considered in future versions.

---

## 4. Database Scope

The database will manage:

* User authentication data
* Business ownership data
* Worker profiles and status
* Ratings and reviews

Relational integrity will be maintained using primary and foreign keys.

---

## 5. Geographical Scope

* Initial deployment focused on Visakhapatnam
* Architecture supports expansion to other cities

---

## 6. Security Scope

* Passwords stored in hashed format
* Role-based access to routes and data
* No public access to admin functionalities

---

## 7. Scalability Considerations

* SQLite used for development
* MySQL planned for production
* Modular backend design

---

## 8. Project Constraints

* Web-based UI only
* Limited frontend stack (HTML/CSS)
* No third-party integrations in phase one

---

## 9. Success Criteria

The project will be considered successful if:

* Businesses can find workers easily
* Workers can register and get approved
* Admin can manage the system without issues
* Data remains consistent and secure

---

## 10. Conclusion

The scope of WorkHub is carefully defined to deliver a stable and usable platform in its first phase. By focusing on core features, the project ensures clarity, maintainability, and room for future expansion.
