# Phase 1: ImgBB Integration, Database Schema Updates, and UI Polish

## Overview
Phase 1 focuses on expanding product capabilities (stock levels and color variants), integrating direct image uploads to ImgBB in the admin panel, and polishing the UI of both the Contact Us and About Us pages with modern responsive layouts and professional card styling.

---

## 1. Mongoose Schema Updates
- **File:** `backend/models/Product.js`
- **Changes:**
  - Add `stock`: Number, default `0`, min `0`.
  - Add `colors`: Array of Strings, default `[]`.
- **Controller Updates (`backend/controllers/productController.js`):**
  - Update `createProduct` to parse and store `stock` and `colors`.
  - Update `updateProduct` to handle updates for `stock` and `colors`.
  - Update initial catalog seeds with default stock levels and color choices.

---

## 2. Admin Panel Updates
- **Files:** `public/admin.html`, `public/js/admin.js`
- **Changes:**
  - In `admin.html`:
    - Add Stock input (`#prodStock`) and Colors input (`#prodColors`).
    - Replace raw image URL text input with `<input type="file" id="prodImageFile" accept="image/*">`.
    - Provide hidden input for existing image URL during edits.
    - Provide instant visual preview container.
    - Add Stock column to catalog table.
  - In `js/admin.js`:
    - Define `IMGBB_API_KEY = 'YOUR_KEY_HERE'`.
    - Implement `uploadImageToImgBB(file)` to upload file directly to `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`.
    - Support both new product creation and updating existing products without requiring image re-upload.
    - Handle stock parsing and color array conversion (comma-separated string to array).
    - Render stock status badges in the product table.

---

## 3. UI Polish
- **Files:** `public/contactus.html`, `public/aboutus.html`, `public/css/style.css`
- **Changes:**
  - **Contact Us:**
    - Display "Reach Us" and "Send Us A Message" side-by-side using CSS Grid (`1fr 1fr` on desktop, `1fr` on mobile/tablet).
    - Modernize `.contact-info-card` and `.contact-form-card` with clean card elevations, polished `.contact-box` micro-interactions, input focus rings, and an attractive action button.
  - **About Us ("Why Choose Pico Picks"):**
    - Redesign `.feature-card` into professional feature cards.
    - Add icon badge containers with subtle brand gradient backgrounds.
    - Add smooth hover lift, warm glow shadows, and icon micro-animations.
    - Clean responsive grid layout for optimal presentation on all screens.
