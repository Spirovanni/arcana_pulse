import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { AlertRule, AlertRuleKind } from "@/lib/types";
import type { NotificationType } from "./notifications";
import { addNotification } from "./notifications";
import { sendEmail } from "./email";
import { logAuditEvent } from "./db/auditLog";
import * as dbAlertRules from "./db/alertRules";

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown

export async function evaluateAndNotify(
  workspaceId: string,
  kind: AlertRuleKind,
  eventData: any
): Promise<void> {
  try {
    // 1. Fetch active rules of this kind in the workspace
    const db = getDatabase();
    const result = await db.listDocuments(DATABASE_ID, COLLECTIONS.alertRules, [
      Query.equal("workspaceId", workspaceId),
      Query.equal("kind", kind),
      Query.equal("active", true),
    ]);

    if (result.documents.length === 0) return;

    // 2. Evaluate each rule
    for (const doc of result.documents) {
      const rule: AlertRule = {
        id: doc.$id,
        workspaceId: doc.workspaceId,
        createdBy: doc.createdBy,
        name: doc.name,
        kind: doc.kind as AlertRuleKind,
        config: doc.config,
        channels: doc.channels || [],
        active: doc.active,
        lastTriggeredAt: doc.lastTriggeredAt ?? undefined,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };

      // 3. Cooldown check (skipped for risk_limit_breach)
      if (kind !== "risk_limit_breach" && rule.lastTriggeredAt) {
        const lastTrigger = new Date(rule.lastTriggeredAt).getTime();
        if (Date.now() - lastTrigger < COOLDOWN_MS) {
          continue; // Under cooldown, skip
        }
      }

      // 4. Config evaluation
      let triggered = false;
      let configObj: any = {};
      try {
        configObj = JSON.parse(rule.config);
      } catch {
        configObj = {};
      }

      if (kind === "price_threshold") {
        const { symbol, currentPrice } = eventData;
        const targetSymbol = configObj.symbol;
        const operator = configObj.operator; // "above" | "below"
        const targetValue = configObj.value;

        if (symbol === targetSymbol && typeof currentPrice === "number" && typeof targetValue === "number") {
          if (operator === "above" && currentPrice >= targetValue) {
            triggered = true;
          } else if (operator === "below" && currentPrice <= targetValue) {
            triggered = true;
          }
        }
      } else if (kind === "strategy_signal") {
        const { symbol, strategyName } = eventData;
        const targetSymbol = configObj.symbol;
        const targetStrategy = configObj.strategyName;

        let symbolMatch = !targetSymbol || symbol === targetSymbol;
        let strategyMatch = !targetStrategy || strategyName === targetStrategy;

        if (symbolMatch && strategyMatch) {
          triggered = true;
        }
      } else if (kind === "paper_order_event") {
        const { symbol } = eventData;
        const targetSymbol = configObj.symbol;

        if (!targetSymbol || symbol === targetSymbol) {
          triggered = true;
        }
      } else if (kind === "risk_limit_breach") {
        // Hard risk control breaches always trigger alerts instantly
        triggered = true;
      }

      if (!triggered) continue;

      // 5. Generate message content
      let title = "";
      let body = "";
      let notifType: NotificationType = "paper_order_event";
      let href = "/dashboard";

      if (kind === "price_threshold") {
        title = `${eventData.symbol} Price Threshold Crossed`;
        body = `${eventData.symbol} is now $${eventData.currentPrice.toFixed(2)}, crossing ${configObj.operator} the threshold of $${configObj.value.toFixed(2)}.`;
        notifType = "price_threshold";
        href = "/intelligence/analytics";
      } else if (kind === "strategy_signal") {
        title = `Strategy Signal: ${eventData.strategyName}`;
        body = `[${eventData.label}] Strategy ${eventData.strategyName} generated an ${eventData.signalType} signal for ${eventData.symbol}.`;
        notifType = "strategy_signal";
        href = "/portfolio";
      } else if (kind === "paper_order_event") {
        title = `Paper Order ${eventData.status.toUpperCase().replace("_", " ")}`;
        body = `Order to ${eventData.side.toUpperCase()} ${eventData.qty ? `${eventData.qty} shares` : `$${eventData.notional}`} of ${eventData.symbol} is ${eventData.status}.`;
        notifType = "paper_order_event";
        href = `/portfolio`;
      } else if (kind === "risk_limit_breach") {
        title = `Risk Limit Breach: ${eventData.limitType}`;
        body = `[${eventData.label}] Hard risk control tripped: ${eventData.limitType} attempted value ${eventData.attemptedValue} exceeded limit of ${eventData.limitValue}.`;
        notifType = "risk_limit_breach";
        href = "/settings";
      }

      // 6. Deliver to channels
      // (a) In-app notification (always delivery)
      await addNotification({
        workspaceId,
        type: notifType,
        severity: kind === "risk_limit_breach" ? "critical" : kind === "strategy_signal" ? "warning" : "info",
        title,
        body,
        href,
        alertRuleId: rule.id,
      });
      await logAuditEvent({
        workspaceId,
        userId: rule.createdBy,
        userEmail: "system@arcanapulse.ai",
        action: "alert_sent",
        targetEntity: "alertRule",
        targetId: rule.id,
        metadata: {
          alertRuleId: rule.id,
          channel: "in_app",
          workspaceId,
        },
      });

      // (b) Email notification (if channel active)
      if (rule.channels.includes("email")) {
        try {
          const userList = await db.listDocuments(DATABASE_ID, COLLECTIONS.users, [
            Query.equal("workspaceId", workspaceId),
          ]);

          const recipientEmails: string[] = [];
          for (const u of userList.documents) {
            let emailOptIn = true;
            if (u.notificationPreferences) {
              try {
                const prefs = JSON.parse(u.notificationPreferences);
                if (prefs.email === false) {
                  emailOptIn = false;
                }
              } catch {
                // Default to true on parse errors
              }
            }
            if (emailOptIn && u.email) {
              recipientEmails.push(u.email);
            }
          }

          if (recipientEmails.length > 0) {
            for (const email of recipientEmails) {
              await sendEmail({
                to: email,
                subject: `[Arcana Pulse Alert] ${title}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
                    <h2 style="color: #C5A059; margin-bottom: 8px; font-weight: 300; letter-spacing: -0.5px;">${title}</h2>
                    <p style="color: #fff; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                      ${body}
                    </p>
                    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                    <p style="color: #555; font-size: 10px;">
                      This alert was generated by active alert rule: <strong>${rule.name}</strong> (${rule.kind})
                    </p>
                  </div>
                `,
              });
            }

            await logAuditEvent({
              workspaceId,
              userId: rule.createdBy,
              userEmail: "system@arcanapulse.ai",
              action: "alert_sent",
              targetEntity: "alertRule",
              targetId: rule.id,
              metadata: {
                alertRuleId: rule.id,
                channel: "email",
                workspaceId,
              },
            });
          }
        } catch (emailErr) {
          console.error("Failed to send alert emails:", emailErr);
        }
      }

      // 7. Update lastTriggeredAt
      await dbAlertRules.updateAlertRule(rule.id, {
        lastTriggeredAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Failed evaluating alerts:", err);
  }
}
