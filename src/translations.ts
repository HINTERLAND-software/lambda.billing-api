export type Locale = 'de' | 'en';

export default {
  en: {
    PERFORMANCE_PERIOD: 'Performance period {{from}} - {{to}}',
    ADDITIONAL_NOTES:
      'Additional work will be charged at an hourly rate of {{netUnitSalesPrice}}€ (net).',
    PROJECTS: 'Projects: {{projects}}',
    PROJECT: 'Project: {{projects}}',
    // TEMPLATES
    DRAFTINVOICE_SUBJECT: 'Draft invoice from {{company name}}',
    DRAFTINVOICE_MESSAGE:
      'Hello,\n\nAttached you can find a PDF file with the draft invoice from {{customer name}} for {{currency}} {{total amount}}.\n\nBest regards\n{{user name}}',
    CREDITNOTE_SUBJECT: 'Credit No $[NUMBER] from {{company name}}',
    CREDITNOTE_MESSAGE:
      'Hello,\n\nclick the button below to display the credit from {{customer name}} for {{currency}} {{total amount}}. Attached you can find a PDF copy of the credit.\n\nBest regards\n{{user name}}',
    INVOICE_SUBJECT: 'Invoice No $[NUMBER] from {{company name}}',
    INVOICE_MESSAGE:
      'Hello,\n \nclick the button below to display the invoice from {{customer name}} for {{currency}} {{total amount}}. Attached you can find a PDF copy of the invoice.\n \nBest regards\n{{user name}}',
    REMINDER_SUBJECT:
      'Payment reminder invoice No {{invoice number}} from {{company name}}',
    REMINDER_MESSAGE:
      'Hello,\n\nWe would like to remind you to pay the invoice below. \n\nInvoice No: {{invoice number}}\nCustomer: {{customer name}}\nAmount due: {{currency}} {{unpaid amount}}\n\n{{reminder text}}\n\nWe apologize if you have already made the payment. In this case you can ignore this reminder.\n\nBest regards\n{{user name}}',
    DRAFTCREDITNOTE_SUBJECT: 'Draft credit from {{company name}}',
    DRAFTCREDITNOTE_MESSAGE:
      'Hello,\n\nclick the button below to display the draft credit from {{customer name}} for {{currency}} {{total amount}}. Attached you can find a PDF copy of the draft credit.\n\nBest regards\n{{user name}}',
    QUOTE_SUBJECT: 'Offer No $[NUMBER] from {{company name}}',
    QUOTE_MESSAGE:
      'Hello,\n \nclick on the link below to view your offer from {{customer name}} for {{currency}} {{total amount}}. Attached you can find a PDF copy of the offer.\n \nBest regards\n{{user name}}',
  },
  de: {
    PERFORMANCE_PERIOD: 'Leistungszeitraum {{from}} - {{to}}',
    ADDITIONAL_NOTES:
      'Zusätzlich anfallende Arbeiten werden zu einem Stundensatz von {{netUnitSalesPrice}}€ (Netto) verrechnet.',
    PROJECTS: 'Projekte: {{projects}}',
    PROJECT: 'Projekt: {{projects}}',
    // TEMPLATES
    DRAFTINVOICE_SUBJECT: 'Rechnungsentwurf von {{company name}}',
    DRAFTINVOICE_MESSAGE:
      'Guten Tag,\n\nIm Anhang finden Sie eine PDF-Datei mit dem Rechnungsentwurf an {{customer name}} über {{currency}} {{total amount}}.\n\nViele Grüße\n{{user name}}',
    CREDITNOTE_SUBJECT: 'Gutschrift Nr. $[NUMBER] von {{company name}}',
    CREDITNOTE_MESSAGE:
      'Guten Tag,\n\nklicken Sie auf den unten stehenden Link, um Ihre Gutschrift an {{customer name}} über {{currency}} {{total amount}} anzeigen zu lassen. Im Anhang befindet sich außerdem eine PDF-Kopie der Gutschrift.\n\nViele Grüße\n{{user name}}',
    INVOICE_SUBJECT: 'Rechnung Nr. $[NUMBER] von {{company name}}',
    INVOICE_MESSAGE:
      'Guten Tag,\n \nklicken Sie auf die unten angezeigte Schaltfläche, um die Rechnung an {{customer name}} über {{currency}} {{total amount}} anzeigen zu lassen. Im Anhang befindet sich außerdem eine PDF-Kopie der Rechnung.\n \nViele Grüße\n{{user name}}',
    REMINDER_SUBJECT:
      'Zahlungserinnerung Rechnungsnr. {{invoice number}} von {{company name}}',
    REMINDER_MESSAGE:
      'Guten Tag,\n\nhiermit möchten wir an die Zahlung der untenstehenden Rechnung erinnern. \n\nRechnungsnummer: {{invoice number}}\nKunde: {{customer name}}\nFälliger Betrag: {{currency}} {{unpaid amount}}\n\n{{reminder text}}\n\nSollten Sie die Zahlung bereits vorgenommen haben, bitten wir um Entschuldigung. In diesem Fall können Sie diese Mahnung ignorieren.\n\nViele Grüße\n{{user name}}',
    DRAFTCREDITNOTE_SUBJECT: 'Gutschrift von {{company name}}',
    DRAFTCREDITNOTE_MESSAGE:
      'Guten Tag,\n\nklicken Sie auf den unten stehenden Link, um Ihre Gutschrift an {{customer name}} über {{currency}} {{total amount}} anzeigen zu lassen. Im Anhang befindet sich außerdem eine PDF-Kopie der Gutschrift.\n\nViele Grüße\n{{user name}}',
    QUOTE_SUBJECT: 'Angebot Nr. $[NUMBER] von {{company name}}',
    QUOTE_MESSAGE:
      'Guten Tag,\n \nklicken Sie auf den unten stehenden Link, um Ihr Angebot an {{customer name}} für {{currency}} {{total amount}} anzeigen zu lassen. Im Anhang befindet sich außerdem eine PDF-Kopie des Angebotes.\n \nViele Grüße\n{{user name}}',
  },
};
