import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";

const effectiveDate = "June 15, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Autobot accesses, uses, stores, shares, and deletes account and connected-service data.",
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope and who we are",
    content: (
      <>
        <p>
          This Privacy Policy explains how Autobot collects, uses, stores,
          shares, and deletes information when you use the Autobot website,
          dashboard, integrations, and AI-assisted features.
        </p>
        <p>
          In this policy, <strong>Autobot</strong>, <strong>we</strong>, and{" "}
          <strong>us</strong> refer to the Autobot service. Questions and
          privacy requests can be sent to{" "}
          <a href="mailto:satpalsinh777@gmail.com">
            satpalsinh777@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>Autobot may collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account and session information:</strong> your name, email
            address, profile image, Google account identifier, login records,
            session tokens, IP address, and browser or device user agent.
          </li>
          <li>
            <strong>Connected-app information:</strong> data you authorize
            Autobot to access from Gmail and Google Calendar. This
            can include emails, message metadata, drafts, labels, calendar
            events, attendees, and availability, depending on the feature and
            permissions you use.
          </li>
          <li>
            <strong>Workspace cache and derived information:</strong> copies of
            connected-app data needed to display your workspace, along with
            generated summaries, priority signals, categories, follow-up
            status, and search data.
          </li>
          <li>
            <strong>Autobot activity:</strong> chat messages, conversation
            titles, AI provider and model choices, action requests, approval
            records, action outcomes, and token-usage counts.
          </li>
          <li>
            <strong>Information stored in your browser:</strong> your selected
            theme and, if you choose bring-your-own-key features, OpenAI or
            OpenRouter API credentials and model preferences.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "connected-services",
    title: "How connected services work",
    content: (
      <>
        <p>
          Google sign-in identifies your Autobot account. Gmail and Google
          Calendar are connected separately, so you choose which workspace
          permissions to grant. Autobot requests authorization through Google
          and uses the resulting credentials only for the connected features
          you use.
        </p>
        <p>
          Connected features can read information and, when you request or
          permit it, take actions such as sending email, organizing messages,
          or creating or updating calendar events. Depending on your selected
          settings, some non-destructive
          actions may run automatically. Destructive calendar deletion always
          requires explicit approval in the current service.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>authenticate you and maintain secure sessions;</li>
          <li>show, search, summarize, and organize your connected workspace;</li>
          <li>perform actions you request or authorize;</li>
          <li>provide AI chat, inbox intelligence, and related features;</li>
          <li>maintain usage allowances and service reliability;</li>
          <li>protect Autobot, connected services, and users from abuse; and</li>
          <li>comply with applicable law and enforce our terms.</li>
        </ul>
        <p>
          We do not sell personal information or connected-service data. We do
          not use Google user data for advertising, retargeting, credit
          decisions, or sale to data brokers.
        </p>
      </>
    ),
  },
  {
    id: "ai-providers",
    title: "AI providers and bring-your-own-key",
    content: (
      <>
        <p>
          To provide AI features, Autobot may send your prompt, recent chat
          context, and relevant connected-workspace content to OpenAI or
          OpenRouter. For example, email text may be sent for classification or
          summarization, and relevant workspace results may be made available
          to an AI model while answering your request.
        </p>
        <p>
          If you use a bring-your-own-key option, the selected API credential
          is stored in your browser profile. It is sent to the Autobot server
          only with the BYOK chat or inbox-intelligence request that needs it,
          and Autobot does not save that credential in its server database.
          Your use of an AI provider is also subject to that provider&apos;s
          policies.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "When information is shared",
    content: (
      <>
        <p>We may share information only as needed with:</p>
        <ul>
          <li>
            Google and other connected services when making requests on your
            behalf;
          </li>
          <li>
            OpenAI or OpenRouter when you use AI-powered features, as described
            above;
          </li>
          <li>
            hosting, database, security, and infrastructure providers that
            process information for Autobot under appropriate obligations; and
          </li>
          <li>
            authorities or other parties when required by law, necessary to
            protect rights and safety, or involved in a service reorganization.
          </li>
        </ul>
        <p>
          We do not permit personnel to read Google user data except with your
          affirmative permission for specific support, when necessary for
          security, when required by law, or in another manner permitted by
          Google&apos;s policies.
        </p>
      </>
    ),
  },
  {
    id: "google-user-data",
    title: "Google API Services User Data",
    content: (
      <>
        <p>
          Autobot&apos;s use and transfer to any other app of information
          received from Google APIs will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            rel="noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          Autobot uses Google user data only to provide or improve prominent,
          user-facing features that you request. We request permissions in the
          connected-app flow and limit use to the practices disclosed in this
          policy and in-product notices.
        </p>
      </>
    ),
  },
  {
    id: "storage-security",
    title: "Storage, security, and retention",
    content: (
      <>
        <p>
          Autobot stores account records, connected-app credentials, cached
          workspace data, chats, usage records, and action records in its
          application database as needed to operate the service. Connected-app
          credentials are encrypted, data is separated by account, and Autobot
          uses reasonable technical and organizational safeguards designed to
          protect information in transit and at rest.
        </p>
        <p>
          No system is completely secure. We retain information while your
          account or connection is active and for as long as reasonably needed
          to operate, secure, and comply with legal obligations. Retention may
          differ by data type and may include limited backup or security
          records after deletion.
        </p>
      </>
    ),
  },
  {
    id: "cookies-browser-storage",
    title: "Cookies and browser storage",
    content: (
      <>
        <p>
          Autobot uses essential authentication cookies to keep you signed in.
          The service also uses browser local storage for your theme choice and
          optional BYOK credentials and preferences.
        </p>
        <p>
          The current Autobot application does not include advertising
          trackers or analytics trackers. If this changes, this policy will be
          updated before those new practices are used.
        </p>
      </>
    ),
  },
  {
    id: "controls",
    title: "Your controls and choices",
    content: (
      <>
        <p>You can control your information in several ways:</p>
        <ul>
          <li>
            Disconnect Gmail or Google Calendar in Settings. Autobot removes
            the stored connection credentials and cached data for that
            integration.
          </li>
          <li>
            Revoke Google access from the provider&apos;s account settings.
          </li>
          <li>
            Delete individual Autobot conversations or all saved chat history
            through Autobot&apos;s AI and data controls.
          </li>
          <li>
            Remove BYOK credentials from Autobot settings or clear this
            site&apos;s local browser storage.
          </li>
        </ul>
        <p>
          To request access, correction, export, or deletion of your full
          Autobot account and remaining personal information, email{" "}
          <a href="mailto:satpalsinh777@gmail.com">
            satpalsinh777@gmail.com
          </a>
          . We may need to verify your identity before completing a request.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        Autobot is not directed to children under 13, and we do not knowingly
        collect personal information from children under 13. If you believe a
        child has provided personal information, contact us so we can review
        and delete it where appropriate.
      </p>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update this policy when the service, providers, or legal
          requirements change. The date at the top will show when the policy
          was last updated. Material changes may also be communicated in the
          service.
        </p>
        <p>
          For questions or privacy requests, contact{" "}
          <a href="mailto:satpalsinh777@gmail.com">
            satpalsinh777@gmail.com
          </a>
          . You can also review the <Link href="/tnc">Terms and Conditions</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary="How Autobot handles account information, connected workspace data, and AI-assisted requests."
      effectiveDate={effectiveDate}
      sections={sections}
    />
  );
}
