export const CONTENT_KEY = 'site';
export const SECTIONS = [
  {
    "key": "social",
    "label": "Social & reviews",
    "help": "Use full HTTPS links. Leave a URL blank to hide it. Links appear in the contact section and footer.",
    "fields": [
      {
        "key": "facebook_url",
        "label": "Facebook page URL",
        "type": "text",
        "max": 500
      },
      {
        "key": "instagram_url",
        "label": "Instagram profile URL",
        "type": "text",
        "max": 500
      },
      {
        "key": "google_review_url",
        "label": "Google review URL",
        "type": "text",
        "max": 500
      },
      {
        "key": "heading",
        "label": "Social links heading (English)",
        "type": "text",
        "max": 100
      },
      {
        "key": "heading_es",
        "label": "Social links heading (Spanish)",
        "type": "text",
        "max": 100
      },
      {
        "key": "review_label",
        "label": "Google review link (English)",
        "type": "text",
        "max": 100
      },
      {
        "key": "review_label_es",
        "label": "Google review link (Spanish)",
        "type": "text",
        "max": 100
      }
    ]
  },
  {
    "key": "brand",
    "label": "Brand & navigation",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "name",
        "label": "Business name",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1",
        "label": "Skip to content (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Skip to content (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "In-home care (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "In-home care (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "Services (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "Services (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "About (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4_es",
        "label": "About (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5",
        "label": "How it works (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "How it works (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "Contact (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "Contact (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7",
        "label": "Legacy Care",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8",
        "label": "Babysitting (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8_es",
        "label": "Babysitting (Spanish)",
        "type": "text",
        "max": 300
      }
    ]
  },
  {
    "key": "contact",
    "label": "Contact",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "phone",
        "label": "Public phone number",
        "type": "text",
        "max": 300
      },
      {
        "key": "email",
        "label": "Public contact email (separate from admin sign-in)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1",
        "label": "Let's talk (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Let's talk (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Because home is where care feels best. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Because home is where care feels best. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "Call us today for a free in-home consultation. No obligation, jus (English)",
        "type": "textarea",
        "max": 357
      },
      {
        "key": "copy_3_es",
        "label": "Call us today for a free in-home consultation. No obligation, jus (Spanish)",
        "type": "textarea",
        "max": 378
      },
      {
        "key": "copy_4",
        "label": "Text us (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4_es",
        "label": "Text us (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5",
        "label": "Email us (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "Email us (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "Serving our local community and surrounding areas. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "Serving our local community and surrounding areas. (Spanish)",
        "type": "text",
        "max": 300
      }
    ]
  },
  {
    "key": "services",
    "label": "Care services",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "copy_1",
        "label": "Our services (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Our services (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Help with the everyday, so home can stay home. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Help with the everyday, so home can stay home. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "From a few hours a week to more comprehensive support. Every plan (English)",
        "type": "textarea",
        "max": 396
      },
      {
        "key": "copy_3_es",
        "label": "From a few hours a week to more comprehensive support. Every plan (Spanish)",
        "type": "textarea",
        "max": 396
      },
      {
        "key": "copy_4",
        "label": "Companion care (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4_es",
        "label": "Companion care (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5",
        "label": "Conversation, company, and someone to share the day with. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "Conversation, company, and someone to share the day with. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "Personal care & bathing assistance (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "Personal care & bathing assistance (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7",
        "label": "Respectful help with bathing, dressing, and grooming. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7_es",
        "label": "Respectful help with bathing, dressing, and grooming. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8",
        "label": "Meal preparation (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8_es",
        "label": "Meal preparation (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9",
        "label": "Home-cooked meals that fit their tastes and any dietary needs. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9_es",
        "label": "Home-cooked meals that fit their tastes and any dietary needs. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_10",
        "label": "Light housekeeping & laundry (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_10_es",
        "label": "Light housekeeping & laundry (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11",
        "label": "Tidy rooms, clean dishes, fresh sheets. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11_es",
        "label": "Tidy rooms, clean dishes, fresh sheets. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12",
        "label": "Medication reminders (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12_es",
        "label": "Medication reminders (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_13",
        "label": "The right medication at the right time, every time. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_13_es",
        "label": "The right medication at the right time, every time. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14",
        "label": "Transportation to appointments (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14_es",
        "label": "Transportation to appointments (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_15",
        "label": "A safe ride to the doctor, the pharmacy, or church. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_15_es",
        "label": "A safe ride to the doctor, the pharmacy, or church. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_16",
        "label": "Grocery shopping & errands (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_16_es",
        "label": "Grocery shopping & errands (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_17",
        "label": "The list gets done and the pantry stays stocked. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_17_es",
        "label": "The list gets done and the pantry stays stocked. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_18",
        "label": "Mobility assistance (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_18_es",
        "label": "Mobility assistance (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_19",
        "label": "A steady arm for walking, standing, and getting around the house. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_19_es",
        "label": "A steady arm for walking, standing, and getting around the house. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_20",
        "label": "Dementia & Alzheimer's support (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_20_es",
        "label": "Dementia & Alzheimer's support (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_21",
        "label": "Patient, consistent care that keeps familiar routines in place. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_21_es",
        "label": "Patient, consistent care that keeps familiar routines in place. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_22",
        "label": "Respite care for family caregivers (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_22_es",
        "label": "Respite care for family caregivers (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_23",
        "label": "Rest for you, with someone trusted looking after them. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_23_es",
        "label": "Rest for you, with someone trusted looking after them. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_24",
        "label": "Not sure what you need yet? Call us. We'll talk about what a good (English)",
        "type": "textarea",
        "max": 381
      },
      {
        "key": "copy_24_es",
        "label": "Not sure what you need yet? Call us. We'll talk about what a good (Spanish)",
        "type": "textarea",
        "max": 354
      }
    ]
  },
  {
    "key": "children",
    "label": "Babysitting & childcare",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number. Leave the rates list empty to hide the rates card.",
    "fields": [
      {
        "key": "pillar_1",
        "label": "Banner: first service (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "pillar_1_es",
        "label": "Banner: first service (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "pillar_2",
        "label": "Banner: second service (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "pillar_2_es",
        "label": "Banner: second service (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "pillar_3",
        "label": "Banner: third service (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "pillar_3_es",
        "label": "Banner: third service (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1",
        "label": "Eyebrow (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Eyebrow (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Heading, first line (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Heading, first line (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "Heading, script line (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "Heading, script line (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "Intro paragraph (English)",
        "type": "textarea",
        "max": 400
      },
      {
        "key": "copy_4_es",
        "label": "Intro paragraph (Spanish)",
        "type": "textarea",
        "max": 400
      },
      {
        "key": "rates_title",
        "label": "Rates card title (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "rates_title_es",
        "label": "Rates card title (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "rates",
        "label": "Babysitting rates",
        "help": "One row per rate. Price is shown as written, followed by the unit below.",
        "type": "list",
        "max": 8,
        "item": [
          {
            "key": "label",
            "label": "Rate name (English)",
            "type": "text",
            "max": 60
          },
          {
            "key": "label_es",
            "label": "Rate name (Spanish)",
            "type": "text",
            "max": 60
          },
          {
            "key": "price",
            "label": "Price (e.g. $18 – $20)",
            "type": "text",
            "max": 24
          },
          {
            "key": "icon",
            "label": "Icon",
            "type": "select",
            "options": [
              {
                "value": "one",
                "label": "One child"
              },
              {
                "value": "two",
                "label": "Two children"
              },
              {
                "value": "three",
                "label": "Three or more children"
              },
              {
                "value": "heart",
                "label": "Heart"
              },
              {
                "value": "calendar",
                "label": "Calendar"
              },
              {
                "value": "moon",
                "label": "Moon (evenings)"
              },
              {
                "value": "home",
                "label": "Home"
              }
            ]
          }
        ]
      },
      {
        "key": "rate_unit",
        "label": "Price unit (English)",
        "type": "text",
        "max": 20
      },
      {
        "key": "rate_unit_es",
        "label": "Price unit (Spanish)",
        "type": "text",
        "max": 20
      },
      {
        "key": "rates_note",
        "label": "Rates card ribbon (English)",
        "type": "text",
        "max": 120
      },
      {
        "key": "rates_note_es",
        "label": "Rates card ribbon (Spanish)",
        "type": "text",
        "max": 120
      },
      {
        "key": "why_title",
        "label": "Why-choose-us card title (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "why_title_es",
        "label": "Why-choose-us card title (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "why",
        "label": "Why choose us",
        "type": "list",
        "max": 8,
        "item": [
          {
            "key": "label",
            "label": "Reason (English)",
            "type": "text",
            "max": 80
          },
          {
            "key": "label_es",
            "label": "Reason (Spanish)",
            "type": "text",
            "max": 80
          }
        ]
      },
      {
        "key": "why_note",
        "label": "Why-choose-us card ribbon (English)",
        "type": "text",
        "max": 120
      },
      {
        "key": "why_note_es",
        "label": "Why-choose-us card ribbon (Spanish)",
        "type": "text",
        "max": 120
      },
      {
        "key": "cta",
        "label": "Call button (English)",
        "type": "text",
        "max": 120
      },
      {
        "key": "cta_es",
        "label": "Call button (Spanish)",
        "type": "text",
        "max": 120
      },
      {
        "key": "cta_text",
        "label": "Text button (English)",
        "type": "text",
        "max": 120
      },
      {
        "key": "cta_text_es",
        "label": "Text button (Spanish)",
        "type": "text",
        "max": 120
      }
    ]
  },
  {
    "key": "about",
    "label": "About Emma",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "copy_1",
        "label": "Our mission (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Our mission (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "To enrich lives, preserve independence, and provide exceptional i (English)",
        "type": "textarea",
        "max": 303
      },
      {
        "key": "copy_2_es",
        "label": "To enrich lives, preserve independence, and provide exceptional i (Spanish)",
        "type": "textarea",
        "max": 384
      },
      {
        "key": "copy_3",
        "label": "Serving our local community and surrounding areas. We're here whe (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "Serving our local community and surrounding areas. We're here whe (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "A note from the owner (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4_es",
        "label": "A note from the owner (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5",
        "label": "Welcome to Legacy Care. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "Welcome to Legacy Care. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "Thank you for taking the time to learn more about who we are. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "Thank you for taking the time to learn more about who we are. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7",
        "label": "I started Legacy Care because I believe everyone deserves to age  (English)",
        "type": "textarea",
        "max": 801
      },
      {
        "key": "copy_7_es",
        "label": "I started Legacy Care because I believe everyone deserves to age  (Spanish)",
        "type": "textarea",
        "max": 810
      },
      {
        "key": "copy_8",
        "label": "As a caregiver, I have experience caring for seniors with a wide  (English)",
        "type": "textarea",
        "max": 1074
      },
      {
        "key": "copy_8_es",
        "label": "As a caregiver, I have experience caring for seniors with a wide  (Spanish)",
        "type": "textarea",
        "max": 1128
      },
      {
        "key": "copy_9",
        "label": "At Legacy Care, you're more than a client; you become part of our (English)",
        "type": "textarea",
        "max": 1032
      },
      {
        "key": "copy_9_es",
        "label": "At Legacy Care, you're more than a client; you become part of our (Spanish)",
        "type": "textarea",
        "max": 1149
      },
      {
        "key": "copy_10",
        "label": "Thank you for considering Legacy Care. It would be an honor to ca (English)",
        "type": "textarea",
        "max": 603
      },
      {
        "key": "copy_10_es",
        "label": "Thank you for considering Legacy Care. It would be an honor to ca (Spanish)",
        "type": "textarea",
        "max": 603
      },
      {
        "key": "copy_11",
        "label": "Emma Patton, Owner, Legacy Care LLC (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11_es",
        "label": "Emma Patton, Owner, Legacy Care LLC (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12",
        "label": "Emma Patton",
        "type": "text",
        "max": 300
      }
    ]
  },
  {
    "key": "process",
    "label": "Getting started",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "copy_1",
        "label": "How it works (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "How it works (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Getting started is simple. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Getting started is simple. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "Call for a free consultation (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "Call for a free consultation (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "We talk about your loved one: what a good day looks like for them (English)",
        "type": "textarea",
        "max": 378
      },
      {
        "key": "copy_4_es",
        "label": "We talk about your loved one: what a good day looks like for them (Spanish)",
        "type": "textarea",
        "max": 357
      },
      {
        "key": "copy_5",
        "label": "Call phone number (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "Call phone number (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "We build a personalized care plan (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "We build a personalized care plan (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7",
        "label": "Hours, routines, preferences. A few hours a week or more comprehe (English)",
        "type": "textarea",
        "max": 426
      },
      {
        "key": "copy_7_es",
        "label": "Hours, routines, preferences. A few hours a week or more comprehe (Spanish)",
        "type": "textarea",
        "max": 402
      },
      {
        "key": "copy_8",
        "label": "Care begins at home (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8_es",
        "label": "Care begins at home (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9",
        "label": "A trusted caregiver, on a schedule you can rely on. We adjust the (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9_es",
        "label": "A trusted caregiver, on a schedule you can rely on. We adjust the (Spanish)",
        "type": "textarea",
        "max": 348
      },
      {
        "key": "copy_10",
        "label": "Specialized care (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_10_es",
        "label": "Specialized care (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11",
        "label": "Dementia & Alzheimer's support (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11_es",
        "label": "Dementia & Alzheimer's support (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12",
        "label": "Familiar routines matter most when memory is failing. We provide  (English)",
        "type": "textarea",
        "max": 555
      },
      {
        "key": "copy_12_es",
        "label": "Familiar routines matter most when memory is failing. We provide  (Spanish)",
        "type": "textarea",
        "max": 606
      },
      {
        "key": "copy_13",
        "label": "For the family (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_13_es",
        "label": "For the family (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14",
        "label": "Respite for family caregivers (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14_es",
        "label": "Respite for family caregivers (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_15",
        "label": "Caring for someone you love is a full-time job. Take an afternoon (English)",
        "type": "textarea",
        "max": 510
      },
      {
        "key": "copy_15_es",
        "label": "Caring for someone you love is a full-time job. Take an afternoon (Spanish)",
        "type": "textarea",
        "max": 537
      }
    ]
  },
  {
    "key": "hero",
    "label": "Welcome",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "copy_1",
        "label": "In-home care for seniors (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "In-home care for seniors (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Care you can (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Care you can (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "count on. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "count on. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "Compassionate, reliable in-home care so your loved one can remain (English)",
        "type": "textarea",
        "max": 327
      },
      {
        "key": "copy_4_es",
        "label": "Compassionate, reliable in-home care so your loved one can remain (Spanish)",
        "type": "textarea",
        "max": 357
      },
      {
        "key": "copy_5",
        "label": "Call phone number (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5_es",
        "label": "Call phone number (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6",
        "label": "See our services (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_6_es",
        "label": "See our services (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7",
        "label": "Free (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_7_es",
        "label": "Free (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8",
        "label": "in-home consultation, no obligation. (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_8_es",
        "label": "in-home consultation, no obligation. (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9",
        "label": "Compassionate, trusted caregivers (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_9_es",
        "label": "Compassionate, trusted caregivers (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_10",
        "label": "Personalized care plans (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_10_es",
        "label": "Personalized care plans (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11",
        "label": "Reliable, flexible scheduling (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_11_es",
        "label": "Reliable, flexible scheduling (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12",
        "label": "Peace of mind for your family (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_12_es",
        "label": "Peace of mind for your family (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_13",
        "label": "Enriching (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_13_es",
        "label": "Enriching (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14",
        "label": "lives (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_14_es",
        "label": "lives (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_15",
        "label": "every day (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_15_es",
        "label": "every day (Spanish)",
        "type": "text",
        "max": 300
      }
    ]
  },
  {
    "key": "footer",
    "label": "Footer",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "copy_1",
        "label": "Trusted & reliable care (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_1_es",
        "label": "Trusted & reliable care (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2",
        "label": "Personalized support (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_2_es",
        "label": "Personalized support (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3",
        "label": "Care in the comfort of home (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_3_es",
        "label": "Care in the comfort of home (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4",
        "label": "Call phone number (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_4_es",
        "label": "Call phone number (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "copy_5",
        "label": "© {year} {business}.",
        "type": "text",
        "max": 300
      }
    ]
  },
  {
    "key": "seo",
    "label": "Search & sharing",
    "help": "English and Spanish are edited separately. Use {phone} in copy to show the current contact number.",
    "fields": [
      {
        "key": "title",
        "label": "Page title (English)",
        "type": "text",
        "max": 300
      },
      {
        "key": "title_es",
        "label": "Page title (Spanish)",
        "type": "text",
        "max": 300
      },
      {
        "key": "description",
        "label": "Search description (English)",
        "type": "textarea",
        "max": 681
      },
      {
        "key": "description_es",
        "label": "Search description (Spanish)",
        "type": "textarea",
        "max": 723
      }
    ]
  }
];
export const DEFAULT_CONTENT = {
  "social": {
    "facebook_url": "https://www.facebook.com/share/1Er6RTdG3u/?mibextid=wwXIfr",
    "instagram_url": "https://www.instagram.com/legacy_carellc/",
    "google_review_url": "https://g.page/r/CcRDkF5piXrHEBI/review",
    "heading": "Stay connected",
    "heading_es": "Sigamos en contacto",
    "review_label": "Leave a Google review",
    "review_label_es": "Deje una reseña en Google"
  },
  "brand": {
    "name": "Legacy Care LLC",
    "copy_1": "Skip to content",
    "copy_1_es": "Saltar al contenido",
    "copy_2": "In-home care",
    "copy_2_es": "Cuidado en el hogar",
    "copy_3": "Services",
    "copy_3_es": "Servicios",
    "copy_4": "About",
    "copy_4_es": "Nosotros",
    "copy_5": "How it works",
    "copy_5_es": "Cómo empezar",
    "copy_6": "Contact",
    "copy_6_es": "Contacto",
    "copy_7": "Legacy Care",
    "copy_8": "Babysitting",
    "copy_8_es": "Niñeras"
  },
  "contact": {
    "phone": "817-565-0648",
    "email": "trustlegacycare@gmail.com",
    "visible": true,
    "copy_1": "Let's talk",
    "copy_1_es": "Hablemos",
    "copy_2": "Because home is where care feels best.",
    "copy_2_es": "Porque el hogar es donde el cuidado se siente mejor.",
    "copy_3": "Call us today for a free in-home consultation. No obligation, just an honest conversation about what your family needs.",
    "copy_3_es": "Llámenos hoy para una consulta gratis en casa. Sin compromiso: solo una conversación honesta sobre lo que necesita su familia.",
    "copy_4": "Text us",
    "copy_4_es": "Envíenos un mensaje",
    "copy_5": "Email us",
    "copy_5_es": "Escríbanos",
    "copy_6": "Serving our local community and surrounding areas.",
    "copy_6_es": "Al servicio de nuestra comunidad local y áreas cercanas."
  },
  "services": {
    "visible": true,
    "copy_1": "Senior care",
    "copy_1_es": "Cuidado de adultos mayores",
    "copy_2": "Help with the everyday, so home can stay home.",
    "copy_2_es": "Ayuda con lo de todos los días, para que su casa siga siendo su hogar.",
    "copy_3": "From a few hours a week to more comprehensive support. Every plan is built around the person, their routines, and their preferences.",
    "copy_3_es": "Desde unas horas a la semana hasta un apoyo más completo. Cada plan se arma alrededor de la persona, sus rutinas y sus preferencias.",
    "copy_4": "Companion care",
    "copy_4_es": "Compañía",
    "copy_5": "Conversation, company, and someone to share the day with.",
    "copy_5_es": "Conversación, compañía y alguien con quien compartir el día.",
    "copy_6": "Personal care & bathing assistance",
    "copy_6_es": "Cuidado personal y ayuda con el baño",
    "copy_7": "Respectful help with bathing, dressing, and grooming.",
    "copy_7_es": "Ayuda respetuosa con el baño, el vestido y el aseo personal.",
    "copy_8": "Meal preparation",
    "copy_8_es": "Preparación de comidas",
    "copy_9": "Home-cooked meals that fit their tastes and any dietary needs.",
    "copy_9_es": "Comidas caseras a su gusto y según sus necesidades alimenticias.",
    "copy_10": "Light housekeeping & laundry",
    "copy_10_es": "Limpieza ligera y lavandería",
    "copy_11": "Tidy rooms, clean dishes, fresh sheets.",
    "copy_11_es": "Cuartos ordenados, trastes limpios, sábanas frescas.",
    "copy_12": "Medication reminders",
    "copy_12_es": "Recordatorios de medicamentos",
    "copy_13": "The right medication at the right time, every time.",
    "copy_13_es": "El medicamento correcto a la hora correcta, siempre.",
    "copy_14": "Transportation to appointments",
    "copy_14_es": "Transporte a citas",
    "copy_15": "A safe ride to the doctor, the pharmacy, or church.",
    "copy_15_es": "Un viaje seguro al doctor, a la farmacia o a la iglesia.",
    "copy_16": "Grocery shopping & errands",
    "copy_16_es": "Compras y mandados",
    "copy_17": "The list gets done and the pantry stays stocked.",
    "copy_17_es": "La lista se cumple y la despensa se mantiene surtida.",
    "copy_18": "Mobility assistance",
    "copy_18_es": "Ayuda con la movilidad",
    "copy_19": "A steady arm for walking, standing, and getting around the house.",
    "copy_19_es": "Un brazo firme para caminar, levantarse y moverse por la casa.",
    "copy_20": "Dementia & Alzheimer's support",
    "copy_20_es": "Apoyo para demencia y Alzheimer",
    "copy_21": "Patient, consistent care that keeps familiar routines in place.",
    "copy_21_es": "Cuidado paciente y constante que mantiene las rutinas familiares.",
    "copy_22": "Respite care for family caregivers",
    "copy_22_es": "Relevo para cuidadores familiares",
    "copy_23": "Rest for you, with someone trusted looking after them.",
    "copy_23_es": "Descanso para usted, con alguien de confianza a cargo.",
    "copy_24": "Not sure what you need yet? Call us. We'll talk about what a good day looks like for your loved one and figure it out together.",
    "copy_24_es": "¿No sabe qué necesita todavía? Llámenos. Platicamos de cómo es un buen día para su ser querido y lo resolvemos juntos."
  },
  "children": {
    "pillar_1": "Senior care",
    "pillar_1_es": "Cuidado de adultos mayores",
    "pillar_2": "Babysitting & childcare",
    "pillar_2_es": "Niñeras y cuidado infantil",
    "pillar_3": "In-home services",
    "pillar_3_es": "Servicios en el hogar",
    "copy_1": "Babysitting & childcare",
    "copy_1_es": "Niñeras y cuidado infantil",
    "copy_2": "Compassionate care for",
    "copy_2_es": "Cuidado compasivo para",
    "copy_3": "every generation.",
    "copy_3_es": "todas las generaciones.",
    "copy_4": "The same trusted, nurturing care, now for the little ones too. We look after your children in your own home: on a regular schedule, for a date night, or for a weekend away.",
    "copy_4_es": "El mismo cuidado cariñoso y de confianza, ahora también para los más pequeños. Cuidamos a sus hijos en su propia casa: con un horario fijo, en una noche de salida o durante un fin de semana fuera.",
    "rates_title": "Babysitting rates",
    "rates_title_es": "Tarifas de niñera",
    "rates": [
      {
        "label": "1 child",
        "label_es": "1 niño",
        "price": "$18 – $20",
        "icon": "one"
      },
      {
        "label": "2 children",
        "label_es": "2 niños",
        "price": "$22 – $25",
        "icon": "two"
      },
      {
        "label": "3 children",
        "label_es": "3 niños",
        "price": "$25 – $30",
        "icon": "three"
      },
      {
        "label": "Date-night care",
        "label_es": "Noche de salida",
        "price": "$20 – $25",
        "icon": "heart"
      },
      {
        "label": "Weekend babysitting",
        "label_es": "Fines de semana",
        "price": "$20 – $25",
        "icon": "calendar"
      }
    ],
    "rate_unit": "/hr",
    "rate_unit_es": "/hora",
    "rates_note": "3-hour minimum booking",
    "rates_note_es": "Mínimo de 3 horas por reserva",
    "why_title": "Why choose us?",
    "why_title_es": "¿Por qué elegirnos?",
    "why": [
      {
        "label": "Experienced & trustworthy",
        "label_es": "Con experiencia y de confianza"
      },
      {
        "label": "Safe & reliable",
        "label_es": "Seguro y confiable"
      },
      {
        "label": "Flexible scheduling",
        "label_es": "Horarios flexibles"
      },
      {
        "label": "Care in your home",
        "label_es": "Cuidado en su hogar"
      },
      {
        "label": "Nurturing, compassionate care",
        "label_es": "Cuidado cariñoso y compasivo"
      }
    ],
    "why_note": "Peace of mind for your family",
    "why_note_es": "Tranquilidad para su familia",
    "cta": "Call {phone} to book",
    "cta_es": "Llame al {phone} para reservar",
    "cta_text": "Text us",
    "cta_text_es": "Envíenos un mensaje"
  },
  "about": {
    "visible": true,
    "copy_1": "Our mission",
    "copy_1_es": "Nuestra misión",
    "copy_2": "To enrich lives, preserve independence, and provide exceptional in-home care that families can trust.",
    "copy_2_es": "Enriquecer vidas, preservar la independencia y brindar un cuidado en el hogar excepcional en el que las familias puedan confiar.",
    "copy_3": "Serving our local community and surrounding areas. We're here when you need us most.",
    "copy_3_es": "Al servicio de nuestra comunidad local y áreas cercanas. Estamos aquí cuando más nos necesita.",
    "copy_4": "A note from the owner",
    "copy_4_es": "Una nota de la dueña",
    "copy_5": "Welcome to Legacy Care.",
    "copy_5_es": "Bienvenidos a Legacy Care.",
    "copy_6": "Thank you for taking the time to learn more about who we are.",
    "copy_6_es": "Gracias por tomarse el tiempo de conocer quiénes somos.",
    "copy_7": "I started Legacy Care because I believe everyone deserves to age with dignity, respect, and compassion in the comfort of their own home. My goal is to provide dependable, personalized care that allows clients to remain independent while giving families peace of mind.",
    "copy_7_es": "Fundé Legacy Care porque creo que todos merecen envejecer con dignidad, respeto y compasión en la comodidad de su propio hogar. Mi meta es brindar un cuidado confiable y personalizado que permita a los clientes mantener su independencia y dé tranquilidad a sus familias.",
    "copy_8": "As a caregiver, I have experience caring for seniors with a wide range of needs: companionship, personal care, mobility assistance, dementia support, meal preparation, medication reminders, light housekeeping, transportation, and more. Every client is unique, and I believe care should always be tailored to their individual needs, preferences, and routines.",
    "copy_8_es": "Como cuidadora, tengo experiencia atendiendo a adultos mayores con una amplia variedad de necesidades: compañía, cuidado personal, ayuda con la movilidad, apoyo para demencia, preparación de comidas, recordatorios de medicamentos, limpieza ligera, transporte y más. Cada cliente es único, y creo que el cuidado siempre debe adaptarse a sus necesidades, preferencias y rutinas.",
    "copy_9": "At Legacy Care, you're more than a client; you become part of our family. I strive to build meaningful relationships based on trust, kindness, honesty, and respect. Whether you or your loved one needs a few hours of assistance each week or more comprehensive support, my commitment is to provide dependable, compassionate care you can count on.",
    "copy_9_es": "En Legacy Care usted es más que un cliente; pasa a ser parte de nuestra familia. Me esfuerzo por construir relaciones significativas basadas en la confianza, la amabilidad, la honestidad y el respeto. Ya sea que usted o su ser querido necesite unas horas de ayuda a la semana o un apoyo más completo, mi compromiso es brindar un cuidado confiable y compasivo con el que pueda contar.",
    "copy_10": "Thank you for considering Legacy Care. It would be an honor to care for you or your loved one and help make each day safer, happier, and more comfortable. I look forward to meeting you and your family.",
    "copy_10_es": "Gracias por considerar a Legacy Care. Sería un honor cuidar de usted o de su ser querido y ayudar a que cada día sea más seguro, más feliz y más cómodo. Espero conocerlos pronto a usted y a su familia.",
    "copy_11": "Emma Patton, Owner, Legacy Care LLC",
    "copy_11_es": "Emma Patton, dueña, Legacy Care LLC",
    "copy_12": "Emma Patton"
  },
  "process": {
    "visible": true,
    "copy_1": "How it works",
    "copy_1_es": "Cómo empezar",
    "copy_2": "Getting started is simple.",
    "copy_2_es": "Empezar es sencillo.",
    "copy_3": "Call for a free consultation",
    "copy_3_es": "Llame para una consulta gratis",
    "copy_4": "We talk about your loved one: what a good day looks like for them, and where an extra pair of hands would make the difference.",
    "copy_4_es": "Platicamos de su ser querido: cómo es un buen día para él o ella, y en qué momentos una mano extra haría la diferencia.",
    "copy_5": "Call {phone}",
    "copy_5_es": "Llamar al {phone}",
    "copy_6": "We build a personalized care plan",
    "copy_6_es": "Armamos un plan de cuidado personalizado",
    "copy_7": "Hours, routines, preferences. A few hours a week or more comprehensive support; the plan is built around the person, not the other way around.",
    "copy_7_es": "Horarios, rutinas, preferencias. Unas horas a la semana o un apoyo más completo; el plan se arma alrededor de la persona, no al revés.",
    "copy_8": "Care begins at home",
    "copy_8_es": "El cuidado empieza en casa",
    "copy_9": "A trusted caregiver, on a schedule you can rely on. We adjust the plan as needs change.",
    "copy_9_es": "Un cuidador de confianza, con un horario en el que puede contar. Ajustamos el plan conforme cambian las necesidades.",
    "copy_10": "Specialized care",
    "copy_10_es": "Cuidado especializado",
    "copy_11": "Dementia & Alzheimer's support",
    "copy_11_es": "Apoyo para demencia y Alzheimer",
    "copy_12": "Familiar routines matter most when memory is failing. We provide patient, consistent care in surroundings they already know, from the same trusted face, and keep the family in the loop.",
    "copy_12_es": "Las rutinas familiares importan más cuando la memoria falla. Ofrecemos un cuidado paciente y constante en un entorno que ya conocen, con el mismo rostro de confianza, y mantenemos a la familia al tanto.",
    "copy_13": "For the family",
    "copy_13_es": "Para la familia",
    "copy_14": "Respite for family caregivers",
    "copy_14_es": "Relevo para cuidadores familiares",
    "copy_15": "Caring for someone you love is a full-time job. Take an afternoon, a weekend, or a week knowing someone trusted is looking after them. You'll come back with more to give.",
    "copy_15_es": "Cuidar a alguien que ama es un trabajo de tiempo completo. Tome una tarde, un fin de semana o una semana sabiendo que hay alguien de confianza a cargo. Regresará con más para dar."
  },
  "hero": {
    "copy_1": "In-home care for every generation",
    "copy_1_es": "Cuidado en el hogar para todas las generaciones",
    "copy_2": "Care you can",
    "copy_2_es": "Cuidado en el que puede",
    "copy_3": "count on.",
    "copy_3_es": "confiar.",
    "copy_4": "Compassionate, reliable in-home care for seniors, and trusted babysitting for the little ones, so the people you love stay safe, comfortable, and at home.",
    "copy_4_es": "Cuidado en el hogar compasivo y confiable para adultos mayores, y cuidado de confianza para los más pequeños, para que sus seres queridos estén seguros, cómodos y en casa.",
    "copy_5": "Call {phone}",
    "copy_5_es": "Llame al {phone}",
    "copy_6": "See our services",
    "copy_6_es": "Ver servicios",
    "copy_7": "Free",
    "copy_7_es": "Gratis",
    "copy_8": "in-home consultation, no obligation.",
    "copy_8_es": "consulta en casa, sin compromiso.",
    "copy_9": "Compassionate, trusted caregivers",
    "copy_9_es": "Cuidadores compasivos y de confianza",
    "copy_10": "Personalized care plans",
    "copy_10_es": "Planes de cuidado personalizados",
    "copy_11": "Reliable, flexible scheduling",
    "copy_11_es": "Servicio confiable y flexible",
    "copy_12": "Peace of mind for your family",
    "copy_12_es": "Tranquilidad para su familia",
    "copy_13": "Enriching",
    "copy_13_es": "Enriqueciendo",
    "copy_14": "lives",
    "copy_14_es": "vidas",
    "copy_15": "every day",
    "copy_15_es": "cada día"
  },
  "footer": {
    "copy_1": "Trusted & reliable care",
    "copy_1_es": "Cuidado confiable y de confianza",
    "copy_2": "Personalized support",
    "copy_2_es": "Apoyo personalizado",
    "copy_3": "Care in the comfort of home",
    "copy_3_es": "Cuidado en la comodidad de su hogar",
    "copy_4": "Call {phone}",
    "copy_4_es": "Llame al {phone}",
    "copy_5": "© {year} {business}."
  },
  "seo": {
    "title": "Legacy Care LLC · Senior Care & Babysitting · Care You Can Count On",
    "title_es": "Legacy Care LLC · Cuidado de adultos mayores y niños · Cuidado en el que puede confiar",
    "description": "Legacy Care LLC provides compassionate in-home senior care and trusted babysitting. Free consultation: 817-565-0648.",
    "description_es": "Legacy Care LLC brinda cuidado en el hogar compasivo para adultos mayores y cuidado de confianza para niños. Consulta gratis: 817-565-0648."
  }
};
