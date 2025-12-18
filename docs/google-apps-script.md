# Helpdesk Email Forwarder - Google Apps Script

This script forwards emails from your Gmail inbox to the helpdesk webhook. It does NOT mark emails as read - that should be done from the helpdesk app after assignment.

## Setup

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project called "Helpdesk Email Forwarder"
3. Replace the default code with the script below
4. Run `resetCutoffToToday()` once to set the start date (only emails from today onwards will be processed)
5. Run `setupTrigger()` once to create the scheduled trigger (runs every 1 minute)
6. Authorize the script when prompted
7. Deploy as Web App (see below)

> **Note:** Google Apps Script doesn't support true "on email received" triggers. 1 minute is the fastest polling interval available.

## The Script

```javascript
// Configuration
const WEBHOOK_URL = 'https://leagues.crypticcabin.com/api/helpdesk/webhook/email';
const LABEL_PROCESSED = 'Helpdesk-Processed';

function processNewEmails() {
  // Get or create the processed label
  let label = GmailApp.getUserLabelByName(LABEL_PROCESSED);
  if (!label) {
    label = GmailApp.createLabel(LABEL_PROCESSED);
  }

  // Get the cutoff date from script properties (or set it to NOW on first run)
  const props = PropertiesService.getScriptProperties();
  let cutoffDate = props.getProperty('CUTOFF_DATE');

  if (!cutoffDate) {
    // First run - set cutoff to NOW, so only future emails are processed
    cutoffDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    props.setProperty('CUTOFF_DATE', cutoffDate);
    Logger.log('First run - set cutoff date to: ' + cutoffDate);
    Logger.log('Only emails from today onwards will be processed');
    return; // Exit on first run to avoid processing old emails
  }

  // Search for unread emails not already processed, after the cutoff date
  const searchQuery = 'is:unread -label:' + LABEL_PROCESSED + ' after:' + cutoffDate;
  const threads = GmailApp.search(searchQuery, 0, 50);

  if (threads.length === 0) {
    return; // No new emails, exit quickly
  }

  Logger.log('Found ' + threads.length + ' unread threads');

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (message.isUnread()) {
        try {
          const emailData = {
            from: message.getFrom(),
            fromName: extractName(message.getFrom()),
            subject: message.getSubject(),
            body: message.getPlainBody(),
            html: message.getBody(),
            messageId: message.getId(),
            date: message.getDate().toISOString()
          };

          // Send to webhook
          const response = UrlFetchApp.fetch(WEBHOOK_URL, {
            method: 'POST',
            contentType: 'application/json',
            payload: JSON.stringify(emailData),
            muteHttpExceptions: true
          });

          Logger.log('Webhook response: ' + response.getResponseCode());

          if (response.getResponseCode() === 200) {
            // Only add label - DO NOT mark as read
            // Email will be marked as read when ticket is assigned in the app
            thread.addLabel(label);
            Logger.log('Processed (not marked read): ' + message.getSubject());
          } else {
            Logger.log('Error: ' + response.getContentText());
          }
        } catch (error) {
          Logger.log('Error processing email: ' + error.toString());
        }
      }
    }
  }
}

function extractName(fromString) {
  const match = fromString.match(/^([^<]+)/);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  return fromString.split('@')[0];
}

// Run this once to set up the trigger - runs every 1 MINUTE for fastest response
function setupTrigger() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Create new trigger - runs every 1 minute (fastest available)
  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('Trigger created - will run every 1 minute');
}

// Run this to reset and start fresh from TODAY (ignores all older emails)
function resetCutoffToToday() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  props.setProperty('CUTOFF_DATE', today);
  Logger.log('Cutoff date reset to: ' + today);
  Logger.log('Only emails from today onwards will be processed');
}

// Web app endpoint to mark emails as read when ticket is assigned
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const messageId = data.messageId;
    const secret = data.secret;

    // Simple security check - set this same secret in your Netlify env vars
    if (secret !== 'beneatsalasagneaday') {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid secret'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!messageId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No messageId provided'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const message = GmailApp.getMessageById(messageId);
    if (message) {
      message.markRead();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        marked: messageId
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Message not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Required for web app
function doGet(e) {
  return ContentService.createTextOutput('Helpdesk Email API is running');
}
```

## Initial Setup Steps

1. **Paste the script** into Google Apps Script
2. **Run `resetCutoffToToday()`** - This sets the cutoff date so only emails from today onwards are processed
3. **Run `setupTrigger()`** - Creates the 1-minute polling trigger
4. **Authorize** when prompted

## Deploy as Web App

To enable marking emails as read from the helpdesk app:

1. In Apps Script, click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone** (the secret provides security)
5. Click **Deploy** and copy the Web App URL
6. Add to Netlify env vars:
   - `GMAIL_WEBAPP_URL` = your web app URL
   - `GMAIL_WEBAPP_SECRET` = `beneatsalasagneaday` (or change both in script and env var)

## How It Works

1. Runs every 1 minute (fastest Google allows)
2. Only processes emails received AFTER the cutoff date (set by `resetCutoffToToday()`)
3. Searches for unread emails without the `Helpdesk-Processed` label
4. Sends each email to the webhook
5. Adds the `Helpdesk-Processed` label (but does NOT mark as read)
6. Emails stay unread in Gmail until ticket is assigned in the helpdesk app

## Notes

- The blocklist is checked server-side in the webhook, not in this script
- If an email fails to send to the webhook, it won't get the label and will be retried
- You can manually re-process emails by removing the `Helpdesk-Processed` label
- Run `resetCutoffToToday()` again if you want to ignore all emails before today
- Google has quotas: ~20,000 URL fetches/day and script runtime limits
