import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";

const effectiveDate = "June 15, 2026";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms that apply when using Autobot and its connected-service and AI features.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    content: (
      <>
        <p>
          These Terms and Conditions govern your access to and use of Autobot,
          including its website, dashboard, connected-app features, AI
          features, and related services.
        </p>
        <p>
          By accessing or using Autobot, you agree to these terms and the{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do
          not use the service.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and accounts",
    content: (
      <>
        <p>
          You must be at least 13 years old to use Autobot. If you are under
          the age of legal majority where you live, you must have permission
          from a parent or legal guardian who agrees to these terms.
        </p>
        <p>
          You must provide accurate account information, keep your Google
          account and devices secure, and promptly notify Autobot if you
          believe your account or connected services have been accessed
          without permission. You are responsible for activity performed
          through your account.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "What Autobot provides",
    content: (
      <>
        <p>
          Autobot provides a command center for reviewing and acting on
          information from connected services such as Gmail and Google
          Calendar. Features may include search, summaries, inbox
          organization, chat, drafting or sending messages, calendar
          management, and related workspace actions.
        </p>
        <p>
          Features may change, be limited, or be discontinued. Some features
          may be experimental, unavailable, or subject to usage allowances.
          Autobot does not promise that every feature will always be available
          or suitable for every purpose.
        </p>
      </>
    ),
  },
  {
    id: "connected-services",
    title: "Connected services and authorization",
    content: (
      <>
        <p>
          You choose whether to connect third-party services and which
          permissions to grant. By connecting a service, you authorize Autobot
          to access its data and make requests to that provider as needed to
          provide the features you use.
        </p>
        <p>
          You represent that you have the right to connect each account and to
          instruct Autobot to access its information or perform actions. You
          can disconnect an integration in Settings and can separately revoke
          access through the third-party provider.
        </p>
      </>
    ),
  },
  {
    id: "actions",
    title: "Actions performed through Autobot",
    content: (
      <>
        <p>
          Autobot can perform actions such as sending email, creating drafts,
          organizing messages, and creating or updating calendar events. You
          are responsible for reviewing
          requests, recipients, dates, content, and settings before permitting
          an action.
        </p>
        <p>
          Depending on your selected settings, Autobot may automatically
          approve and execute certain non-destructive actions. Other actions
          require approval, and destructive calendar deletion currently always
          requires explicit approval. You remain responsible for actions
          performed through your account, including automatically approved
          actions.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI-generated content and results",
    content: (
      <>
        <p>
          Autobot uses AI models to generate replies, summaries,
          classifications, search assistance, and action suggestions. AI
          output can be inaccurate, incomplete, outdated, or inappropriate.
          You must review important output before relying on it or using it to
          communicate or take action.
        </p>
        <p>
          Autobot is not a substitute for professional legal, medical,
          financial, employment, or other regulated advice. You are
          responsible for evaluating whether AI output and requested actions
          are appropriate for your circumstances.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You must not use Autobot to:</p>
        <ul>
          <li>violate any law, regulation, court order, or third-party right;</li>
          <li>
            access, monitor, or act on an account or information without
            authorization;
          </li>
          <li>
            send spam, phishing, malware, harassment, or deceptive
            communications;
          </li>
          <li>
            interfere with, probe, overload, reverse engineer, or bypass the
            security or usage controls of the service;
          </li>
          <li>
            use Autobot or connected-service data for surveillance,
            advertising, credit decisions, or unlawful profiling; or
          </li>
          <li>
            help another person do anything prohibited by these terms.
          </li>
        </ul>
        <p>
          We may investigate suspected misuse and restrict or suspend access
          when reasonably necessary to protect users, providers, or the
          service.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content and privacy",
    content: (
      <>
        <p>
          You retain your rights in content and data you provide or connect.
          You grant Autobot the limited permission needed to host, process,
          transmit, display, and act on that information to provide, secure,
          and maintain the service.
        </p>
        <p>
          Autobot handles personal information as described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. You are responsible for
          ensuring your use of Autobot and any information you provide complies
          with applicable privacy, confidentiality, and data-protection
          obligations.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <>
        <p>
          Autobot depends on third-party services, including Google, OpenAI,
          OpenRouter, and infrastructure providers. Your use of those
          services may be governed by their own terms, policies, permissions,
          quotas, and availability.
        </p>
        <p>
          Autobot does not control third-party services and is not responsible
          for their content, security, changes, outages, suspensions, or
          decisions to restrict your account or Autobot&apos;s access.
        </p>
      </>
    ),
  },
  {
    id: "autobot-rights",
    title: "Autobot materials",
    content: (
      <p>
        Autobot and its software, branding, design, documentation, and other
        materials are protected by applicable intellectual-property laws.
        These terms give you a limited, personal, revocable,
        non-transferable right to use the service as provided. They do not
        transfer ownership of Autobot materials to you.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: (
      <>
        <p>
          You may stop using Autobot at any time and disconnect connected
          services. You may request deletion of your Autobot account by
          contacting support.
        </p>
        <p>
          We may suspend, restrict, or terminate access if you violate these
          terms, create risk or legal exposure, misuse connected services, or
          if continued operation is no longer practical. Where reasonable, we
          will try to provide notice and an opportunity to resolve the issue.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <>
        <p>
          Autobot is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis. To the maximum extent permitted by law,
          Autobot disclaims all warranties, whether express, implied, or
          statutory, including warranties of merchantability, fitness for a
          particular purpose, non-infringement, accuracy, and uninterrupted or
          error-free operation.
        </p>
        <p>
          We do not guarantee that Autobot will prevent mistakes, preserve all
          data, correctly interpret every instruction, or successfully
          complete every connected-service request. Maintain appropriate
          backups and review important actions.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <p>
        To the maximum extent permitted by applicable law, Autobot will not be
        liable for indirect, incidental, special, consequential, exemplary, or
        punitive damages, or for lost profits, revenues, data, goodwill, or
        business opportunities arising from or related to the service. Where
        liability cannot be excluded, Autobot&apos;s total liability will be
        limited to the amount you paid to Autobot for the service during the
        twelve months before the event giving rise to the claim, or INR 1,000
        if you paid nothing. Some jurisdictions do not allow certain
        limitations, so parts of this section may not apply to you.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    content: (
      <p>
        To the extent permitted by law, you agree to defend, indemnify, and
        hold Autobot harmless from claims, losses, liabilities, and expenses
        arising from your content, your connected accounts, your use or misuse
        of the service, or your violation of these terms or another
        person&apos;s rights.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    content: (
      <p>
        These terms are governed by the laws of India, without regard to
        conflict-of-law principles. Subject to any rights you have under
        mandatory local law, disputes relating to these terms or Autobot will
        be submitted to courts of competent jurisdiction in India.
      </p>
    ),
  },
  {
    id: "general",
    title: "General terms",
    content: (
      <>
        <p>
          If part of these terms is found unenforceable, the remaining terms
          will continue in effect. Failure to enforce a term is not a waiver.
          You may not transfer these terms without Autobot&apos;s consent.
          Autobot may transfer them as part of a reorganization or transfer of
          the service.
        </p>
        <p>
          These terms, together with the Privacy Policy and any in-product
          terms presented for a feature, form the agreement between you and
          Autobot regarding the service.
        </p>
      </>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update these terms as Autobot changes. The effective date at
          the top identifies the latest version. Continued use after updated
          terms take effect means you accept the updated terms, where
          permitted by law.
        </p>
        <p>
          Questions, notices, and account-deletion requests can be sent to{" "}
          <a href="mailto:satpalsinh777@gmail.com">
            satpalsinh777@gmail.com
          </a>
          .
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      summary="The rules and responsibilities that apply when you use Autobot, its connected services, and AI-assisted actions."
      effectiveDate={effectiveDate}
      sections={sections}
    />
  );
}
