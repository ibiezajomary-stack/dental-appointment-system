# iSmile Dental Appointment System - Revision Specifications

## 1. Overview
This document outlines the detailed functional and business logic specifications for the requested revisions to the **iSmile Dental Appointment System**.

---

## 2. Detailed Revision Specifications

### Feature 1: Patient Profile Save Notification
* **Requirement:** Display a confirmation visual message box when a user clicks the "SAVE" button on the profile page.
* **UI/UX Changes:** 
  * Trigger a modal/toast notification upon successful form submission.
  * Message Content: `"Profile updated successfully."` or `"Successfully saved!"`
* **Functional Requirements:**
  * Prevent UI reset before backend confirmation.
  * Automatically dismiss after 3 seconds or allow manual closing.

---

### Feature 2: Digital Signature & Layout Updates for Dental Certificates
* **Requirement:** Add the dentist's official signature image above the name/license footer on generated Dental Certificates.
* **Document Layout Specs:**
  * **Header:** Document Title: `DENTAL CERTIFICATE` (Centered, Bold).
  * **Date:** Right-aligned (Format: `MMMM DD, YYYY`).
  * **Body:** Standardized certificate text template.
  * **Footer:** 
    * Digital Signature overlay/image placement directly above dentist details.
    * Dentist Full Name (e.g., `DR. LUCIA G. PALMA`).
    * Specialization / Clinic Name.
    * Professional License Number (e.g., `Lic. # lic.#022990`).

---

### Feature 3: Date & Time Validation for Blocked Times ("Unavailable Times")
* **Requirement:** Restrict blocking time/dates for past dates or past time slots.
* **Business Logic:**
  * `Block Date/Time >= Current System Date & Time`.
* **Validation Rules:**
  * Past dates on the interactive calendar grid must be disabled (greyed out) for the "Set Block Appointment" action.
  * System should throw a validation error message: `"Cannot block time or set unavailability for past dates/times."` if bypassed.

---

### Feature 4: Daily Income Entry Date Validation
* **Requirement:** Prevent recording or editing clinic income for future dates, ensuring financial entries only reflect present or past transactions.
* **Business Logic:**
  * `Income Date <= Current System Date`.
* **Validation Rules:**
  * Datepicker component in the **Payments / Income Report** view must disable future selection.
  * Throw an error message if an invalid date is submitted: `"Income cannot be recorded for future dates."`

---

### Feature 5: Appointment Confirmation Logic & Expiration Notifications
* **Requirement:** Prevent dentists from confirming past appointments, and automatically trigger notifications for expired unconfirmed appointments.
* **Business Logic:**
  1. **Confirmation Block:** Dentists cannot change an appointment status to `Confirmed` if `Appointment Date/Time < Current System Date/Time`.
  2. **Patient Expiration Notification:** If an appointment reaches its scheduled time while still in `Pending` status:
     * Patient receives notification: *"Your appointment scheduled for [Date & Time] was not confirmed and has expired."*
  3. **Dentist Overdue Notification:** 
     * Dentist receives notification: *"You have an unconfirmed pending appointment for [Patient Name] on [Date & Time] that has expired."*
  4. **Status Lifecycle:** Automatically or manually mark unconfirmed past appointments as `Expired` / `Cancelled`.

---

### Feature 6: Prescription Layout & Digital Signature Integration
* **Requirement:** Re-layout the generated Prescription ($\text{Rx}$) document for clean text alignment and integrate dentist signature support.
* **Document Layout Specs:**
  * **Patient Info Header:**
    * Name: `[Patient Name]`
    * Date: `[Date]`
    * Address: `[Patient Address]`
    * Age/Gender: `[Age] / [Gender]`
  * **$\text{Rx}$ Content Section:**
    * Prominent $\mathbf{Rx}$ symbol.
    * Formatted multi-line text for:
      * **Medication:** List of prescribed items (e.g., *Mefenamic Acid, Amoxicillin*).
      * **Notes/Diagnosis:** (e.g., *Severe Toothache*).
      * **Treatment Plan/Duration:** (e.g., *7 Days*).
  * **Footer Section:**
    * Divider line.
    * Dentist Digital Signature Image.
    * Doctor Name: `DR. LUCIA G. PALMA`
    * License Number: `Lic. No.: lic.#022990`

---

## 3. Summary Matrix of Actions

| # | Feature / Area | Scope | Primary Users | Key Condition |
|---|---|---|---|---|
| **1** | Profile Save | Success Feedback | Patients, Dentists | On successful Save trigger modal/toast. |
| **2** | Dental Certificate | Layout & Signature | Dentists, Patients | Digital signature image dynamic injection. |
| **3** | Block Times | Date Validation | Dentists | Block date $\ge$ Today. |
| **4** | Income Report | Date Validation | Dentists / Staff | Income date $\le$ Today. |
| **5** | Appointments | Expiration Logic & Alert | Dentists, Patients | Status change blocked for past dates + automated push/in-app alert. |
| **6** | Prescription Printing | Format & Signature | Dentists, Patients | Clean $\text{Rx}$ structure layout + digital signature. |