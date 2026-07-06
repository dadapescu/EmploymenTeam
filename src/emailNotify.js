import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_z45amnl";
const TEMPLATE_ID = "template_s8ubbjp";
const PUBLIC_KEY = "oDTcKqA5frExE3lTu";

// Map each team member to their real email address
const EMAILS = {
  Andrada: "andrada.popescu@kinstellar.com",
  Claudiu: "claudiu.ciubotaru@kinstellar.com",
  Rena: "rena.saftencu@kinstellar.com",
};

/**
 * Sends a "new task" notification email to everyone involved in the task
 * except the person who created it.
 * @param {object} params
 * @param {string} params.fromName - name of the person creating the task
 * @param {string} params.taskTitle - task title (with client prefix if any)
 * @param {string[]} params.recipients - list of person names to notify (assignees + owner, minus creator)
 */
export async function notifyNewTask({ fromName, taskTitle, recipients }) {
  const uniqueRecipients = [...new Set(recipients)].filter((r) => r !== fromName && EMAILS[r]);

  for (const person of uniqueRecipients) {
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_name: person,
          to_email: EMAILS[person],
          from_name: fromName,
          task_title: taskTitle,
        },
        { publicKey: PUBLIC_KEY }
      );
    } catch (err) {
      // Don't block the app if email fails - just log it
      console.error("Email notification failed for", person, err);
    }
  }
}
