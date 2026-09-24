# Shree Optical RX Order Manager - V7 WhatsApp Share Fix

This version keeps the existing three WhatsApp templates and fixes the share/open mechanism so one click performs exactly one WhatsApp navigation. It removes the window.open()+fallback combination and adds a short duplicate-click guard.

Templates remain:
- whatsapp_sizal_customer_template: SIZAL Ref. Name customer confirmation
- whatsapp_glass_customer_template: Glass RX Ref. Name customer confirmation
- whatsapp_office_template: Mumbai Office detailed template

No pricing calculation is restored.


## V8 SIZAL PDF
- Added compact black-and-white SIZAL RX PDF generation matching the supplied RX slip layout.
- Glass RX remains unchanged and has no SIZAL PDF button.
- PDF filename uses the order number, sanitized for Windows filenames.
