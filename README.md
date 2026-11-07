# Zawiya Ship Labels

Build a simple, mobile-first web application called Zawiya Books Shipping Label Generator.



PURPOSE



This is an internal tool for Zawiya Books to quickly create printable shipping labels for sending books through India Post.



The main workflow should be:



Enter/Paste Orders → Review Orders → Select India Post Service → Enter Tracking Numbers → Generate QR Codes → Generate A4 Printable Labels



The app should be extremely simple and fast to use on a mobile phone.



Do NOT make this a complicated e-commerce or logistics system.



---



1. DESIGN STYLE



Create a clean, professional, minimal interface.



Design principles:



- Mobile-first

- Fast

- White background

- Black/dark text

- Subtle borders

- Minimal use of colors

- Professional business-tool appearance

- Large touch-friendly buttons

- Clear typography

- No unnecessary animations

- No illustrations

- No decorative elements

- No music

- Responsive on mobile, tablet and desktop



The generated shipping labels should be optimized for black-and-white printing.



---



2. MAIN DASHBOARD



Create a simple dashboard with these sections:



Header



Logo/name:



Zawiya Books



Subtitle:



Shipping Label Generator



Main buttons:



1. New Shipment

2. Paste Orders

3. Generate Labels



Also show a small summary:



- Orders loaded

- Labels ready

- Labels generated



Do not create a complicated sidebar.



---



3. FIXED SENDER DETAILS



Create a Settings section where sender information can be entered once and then saved locally in the browser.



The sender details should be used automatically on every label.



Fields:



- Sender Name

- Address Line 1

- Address Line 2

- Place

- Post Office

- District

- State

- PIN Code

- Mobile Number



The user should not need to enter sender information for every shipment.



Use browser local storage for these settings.



Do NOT create a backend database.



---



4. ORDER INPUT



Provide two ways to add orders.



OPTION A — Manual Entry



Create a simple form with:



- Order ID

- Customer Name

- Address

- PIN Code

- Mobile Number

- Book Name

- Quantity

- Amount



Keep the form compact.



Address should be a large multiline field.



Button:



Add Order



---



5. OPTION B — COPY/PASTE BULK ORDERS



This is a very important feature.



Create a large textarea titled:



Paste Orders



The user should be able to copy rows directly from Excel or Google Sheets and paste them into the textarea.



Expected column order:



Order ID

Customer Name

Address

PIN Code

Mobile

Book Name

Quantity

Amount



Example:



ORD001	Ali Muhammed	12/45 Main Road, Kottakkal, Malappuram, Kerala	676503	9876543210	Hirayil Ninn Hridayathilekku	1	220

ORD002	Ameen P	23 Beach Road, Kozhikode, Kerala	673001	9876501234	Hirayil Ninn Hridayathilekku	2	440



Use TAB-separated values as the primary import format because this works naturally with Excel and Google Sheets.



Also support comma-separated values where possible.



After pasting, parse the data automatically.



Show a preview table before adding the orders.



The preview table should show:



Order ID| Customer| PIN| Mobile| Book| Qty| Amount



Allow the user to remove invalid rows.



Show clear validation errors for:



- Missing customer name

- Missing address

- Invalid/missing PIN

- Missing order ID



Do not block the entire import because of one invalid row.



---



6. ORDER LIST



After importing orders, show a clean list of all shipments.



Each row/card should show:



- Order ID

- Customer

- PIN

- Book

- Quantity

- Amount

- Tracking Number

- Service

- Status



Status options:



- Ready

- Tracking Added

- Label Ready



Allow:



- Edit

- Delete

- Add tracking number



Also provide:



Select All



and individual checkboxes.



---



7. INDIA POST SERVICE



Before generating labels, allow the user to select the postal service.



Dropdown:



- Speed Post

- India Post Parcel

- Book Post

- Registered Post

- Other



The selected service should appear on the shipping label.



Do not attempt to connect to India Post APIs.



This application is only a label-generation tool.



---



8. TRACKING NUMBER



Tracking/consignment numbers will be entered manually.



For each order provide:



Tracking / Consignment Number



Example:



EM123456789IN



Add a button:



Generate QR



The QR code should encode the exact tracking/consignment number.



The QR code should be clearly visible on the printed label.



Do NOT automatically invent tracking numbers.



Do NOT claim that the QR code is an official India Post barcode.



It is simply a QR representation of the manually entered tracking number.



---



9. BULK TRACKING INPUT



Because many orders may be processed together, provide an optional bulk tracking-number input method.



Allow users to paste tracking numbers line-by-line in the same order as the selected orders.



Example:



EM123456789IN

EM123456790IN

EM123456791IN



Match each tracking number to the selected order in sequence.



Show a confirmation before applying them.



---



10. SHIPPING LABEL DESIGN



Create a professional black-and-white shipping label.



Each label should contain:



TOP



ZAWIYA BOOKS



Small subtitle:



BOOK SHIPMENT



Then:



INDIA POST



and the selected service:



SPEED POST



or



PARCEL



etc.



---



FROM



FROM



Sender Name



Full sender address



PIN: XXXXXXX



Mobile: XXXXXXXX



---



TO



Make the recipient section visually dominant.



TO



CUSTOMER NAME



Full Address



PIN: XXXXXXX



Mobile: XXXXXXXX



The recipient name and PIN should be large and easy to read.



---



ORDER DETAILS



Order ID: XXXXX



Book: XXXXX



Quantity: X



Amount: ₹XXX



---



TRACKING



TRACKING / CONSIGNMENT NO.



EM123456789IN



Place the QR code beside or below the tracking number.



---



11. A4 PRINT LAYOUT



The final output must be designed specifically for A4 paper.



Default:



A4 Portrait



Automatically fit multiple labels on each A4 page.



Prefer a layout of approximately:



2 labels per row × 2 labels per page



depending on the available printable space.



Each label should have:



- Clear border

- Consistent margins

- Enough spacing

- No clipping

- No overlapping

- No unnecessary whitespace



The user should be able to print directly from the browser.



Provide:



Print Labels



and



Download PDF



buttons.



The print version must hide all application UI and show only the labels.



Use CSS print media queries.



---



12. LABEL PREVIEW



Before printing, show a preview.



Allow the user to:



- Preview all labels

- Move between pages

- See how the A4 sheet will look

- Return to editing



Show:



Page 1 of X



and navigation buttons.



---



13. PDF GENERATION



Generate a clean A4 PDF containing the selected labels.



The PDF should preserve:



- A4 dimensions

- Label borders

- Text alignment

- QR codes

- Proper margins

- Print quality



Filename format:



Zawiya-Books-Labels-YYYY-MM-DD.pdf



If possible, include the number of labels:



Zawiya-Books-Labels-2026-09-28-25-Labels.pdf



---



14. MOBILE EXPERIENCE



The application will primarily be used on a smartphone.



Therefore:



- Large buttons

- Large input fields

- Sticky bottom action button where appropriate

- Avoid wide tables on small screens

- Convert tables into cards on mobile

- Make copy/paste extremely easy

- Make the "Generate Labels" button prominent



However, the actual label preview and print layout should use proper A4 dimensions regardless of screen size.



---



15. NO DATABASE



Keep this application simple.



Do not require:



- User accounts

- Login

- Backend

- Database

- Cloud storage

- Payment system

- India Post API

- E-commerce functionality



Use local browser storage only for:



- Fixed sender details

- Basic app preferences



Imported shipment data can remain temporary and can be cleared when the user starts a new batch.



Add:



Clear All Orders



with a confirmation dialog.



---



16. ERROR HANDLING



Provide friendly validation.



Examples:



If PIN is missing:



PIN code is required



If tracking number is missing:



Add a tracking number before generating the label



If no orders are selected:



Select at least one order



If sender details are missing:



Complete sender details in Settings



Do not use technical error messages.



---



17. WORKFLOW



The ideal workflow should be:



Step 1



Open app.



Step 2



Paste orders from Excel/Google Sheets.



Step 3



Review imported orders.



Step 4



Select India Post service.



Step 5



Enter/paste tracking numbers.



Step 6



Generate QR codes.



Step 7



Preview labels.



Step 8



Generate A4 PDF.



Step 9



Print.



The entire process should require as few clicks as possible.



---



18. SAMPLE DATA



Include sample/demo data during development so the UI can be tested.



Use fictional sample information.



Do not use real customer information.



---



19. TECHNICAL REQUIREMENTS



Use a modern frontend stack supported by Lovable.



Prefer:



- React

- TypeScript

- Tailwind CSS

- Clean component architecture



Use a reliable QR-code generation library.



Use a reliable PDF generation approach that can produce true A4 pages.



Ensure QR codes remain readable when printed.



Make the application responsive.



---



20. IMPORTANT CONSTRAINTS



Do not:



- Connect to India Post

- Automatically generate fake tracking numbers

- Claim the generated QR code is an official India Post barcode

- Add unnecessary logistics features

- Add payment processing

- Add customer login

- Add unnecessary dashboards

- Add complicated inventory management

- Add animations that slow down the workflow



This should feel like a small, fast internal tool, not a full logistics platform.



---



21. FINAL UI STRUCTURE



Use this simple structure:



Header



Zawiya Books

Shipping Label Generator



↓



New Batch



Paste Orders

or

Add Order



↓



Orders



Imported orders list



↓



Shipping Service



India Post service selector



↓



Tracking



Manual tracking number input



↓



Labels



Preview Labels

Generate PDF

Print



↓



Settings



Fixed Sender Details



Keep navigation minimal and intuitive.



Build the application completely functional, not just a visual mockup.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zblabels.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bd9ccf2e-5ebd-4457-966f-3df1758b1432).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
