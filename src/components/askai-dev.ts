export const IS_LOCAL_DEV =
  typeof window !== 'undefined' && window.location.hostname.includes('localhost');

export const DEV_PLACEHOLDER_PROMPT = '(dev) simulated prompt';

export const DEV_SAMPLE_RESPONSE =
  "Here's a sample response demonstrating how the AI would answer this question. It should include concise steps, links to relevant docs, and any important caveats.";

export const DEV_TRANSCRIPT_CONTENT = [
  {
    role: 'user' as const,
    content: 'What is a good local workflow for testing paywalls?',
  },
  {
    role: 'assistant' as const,
    content: `### Local testing checklist

- Use the **debug paywall** in the dashboard and set the device to *Tester*.
- In iOS, enable StoreKit testing and ensure sandbox users are signed out of App Store.
- Call \`Superwall.shared.debugInfo()\` after configure to verify environment.
- In development, set \`paywallPresentation\` to manual and gate with feature flags.

\`\`\`swift
let options = SuperwallOptions()
options.paywalls.isHapticFeedbackEnabled = true
options.paywalls.presentationStyle = .modal
Superwall.configure(apiKey: "sk_test_xxx", options: options)
\`\`\`

Troubleshooting:
- No paywall? Confirm the rule matches the event name and the user is eligible.
- Stuck spinner? Check device time drift and receipt corruption (reset StoreKit).`,
  },
  {
    role: 'user' as const,
    content: 'How do I track subscription state changes reliably?',
  },
  {
    role: 'assistant' as const,
    content: `Subscribe to \`Superwall.shared.subscriptionStatus\` and forward analytics to your data plane.

| Event | When it fires | Notes |
| --- | --- | --- |
| \`subscriptionStatusDidChange\` | Any entitlement change | Fired after receipt validation |
| \`paywallDeclined\` | User closes without purchasing | Good for funnel drop-off |
| \`transactionAbandoned\` | Billing issues | Consider sending an email nudge |

Also emit your own event on app launch to backfill dashboards.`,
  },
  {
    role: 'user' as const,
    content: 'Can I localize paywalls and trials?',
  },
  {
    role: 'assistant' as const,
    content: `Yes. Add locale variants in the dashboard and supply localized product metadata.

- Create a *Localization* per language with copy + images.
- In your app, pass \`localeIdentifier\` when tracking events to force a variant.
- Keep trial messaging consistent with App Store Connect durations.

Example forcing locale:
\`\`\`swift
Superwall.shared.track(
  event: "paywall_open",
  params: ["locale": "fr_FR"]
)
\`\`\``,
  },
  {
    role: 'user' as const,
    content: 'How do I integrate Superwall in React Native with Android product flavors?',
  },
  {
    role: 'assistant' as const,
    content: `For Expo/React Native:

1) Install the Expo module and run \`expo prebuild\`.
2) In \`android/app/build.gradle\`, set flavor-specific \`superwallApiKey\` via \`resValue\`.
3) In JS, read the flavor via \`Application.android.packageName\` or a build-time env and pass the matching API key into \`configure\`.

\`\`\`ts
import Superwall from '@superwall/react-native-superwall';

Superwall.configure({
  apiKey: Constants.expoConfig?.extra?.SUPERWALL_KEY,
  options: { logLevel: 'info' },
});
\`\`\`

Remember to test purchases per flavor to avoid mixing receipts across package IDs.`,
  },
  {
    role: 'user' as const,
    content: 'What should I include when reporting an AI answer issue?',
  },
  {
    role: 'assistant' as const,
    content: `Include:
- Conversation ID (from the Debug menu)
- Question + expected answer
- SDK/platform context
- Screenshot if formatting is broken

Send it to support so we can retrain quickly.`,
  },
];
