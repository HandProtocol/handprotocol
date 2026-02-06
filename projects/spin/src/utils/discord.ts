interface WebhookPayload {
  content: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
}

async function sendWebhook(payload: WebhookPayload, webhookType: 'spin' | 'donation' | 'usdglo') {
  const webhookUrls = {
    spin: import.meta.env.VITE_DISCORD_SPIN_WEBHOOK_URL,
    donation: import.meta.env.VITE_DISCORD_DONATION_WEBHOOK_URL,
    usdglo: import.meta.env.VITE_DISCORD_USDGLO_WEBHOOK_URL
  };
  
  const webhookUrl = webhookUrls[webhookType];
  
  if (!webhookUrl) {
    console.warn(`Discord ${webhookType} webhook URL not configured`);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

export const sendSpinWebhook = async () => {
  const payload: WebhookPayload = {
    content: "🎡 Wheel Spin Alert!",
    embeds: [{
      title: "Someone is spinning the Impact Projects wheel!",
      description: "A new potential donor is exploring projects to support.",
      color: 0xFFA500, // Orange color
      fields: [
        {
          name: "Time",
          value: new Date().toLocaleString(),
          inline: true
        }
      ]
    }]
  };

  await sendWebhook(payload, 'spin');
};

export const sendGetUSDGLOWebhook = async () => {
  const payload: WebhookPayload = {
    content: "💰 $USDGLO Interest Alert!",
    embeds: [{
      title: "Someone is interested in getting $USDGLO!",
      description: "A visitor clicked to learn more about $USDGLO.",
      color: 0xFFD700, // Gold color
      fields: [
        {
          name: "Time",
          value: new Date().toLocaleString(),
          inline: true
        }
      ]
    }]
  };

  await sendWebhook(payload, 'usdglo');
};

export const sendDonationWebhook = async (project: {
  name: string;
  description: string;
  link: string;
  category?: string;
}) => {
  const payload: WebhookPayload = {
    content: "🎉 Potential Donation Alert!",
    embeds: [{
      title: `${project.name} may receive a donation!`,
      description: project.description,
      color: 0x9F7AEA, // Purple color
      fields: [
        {
          name: "Project Link",
          value: project.link,
          inline: true
        },
        {
          name: "Category",
          value: project.category || "Not specified",
          inline: true
        },
        {
          name: "Time",
          value: new Date().toLocaleString(),
          inline: true
        }
      ]
    }]
  };

  await sendWebhook(payload, 'donation');
};