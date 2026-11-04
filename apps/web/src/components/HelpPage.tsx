import { HELP_PATH, HOME_PATH, KOFI_URL, LIVEPIX_URL, SUPPORT_EMAIL } from "../lib/publicPages";
import type { ThemeMode } from "../lib/theme";
import { AppLogo } from "./AppLogo";
import { PublicFooter } from "./PublicFooter";
import { ThemeToggleButton } from "./ThemeToggleButton";

export interface HelpPageProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const HELP_STEPS = [
  {
    title: "Create a room",
    description: "Enter your display name on the home page and create a room to become the host.",
  },
  {
    title: "Share the room code or link",
    description: "Send the code, copied link, or QR code so everyone can join the same session.",
  },
  {
    title: "Join as a participant",
    description:
      "Participants enter the room code and a display name, then land straight in the room.",
  },
  {
    title: "Vote privately",
    description:
      "Everyone can pick a planning card as soon as they join, without revealing it to the group yet.",
  },
  {
    title: "Reveal and discuss",
    description: "The host reveals every vote together so the team can compare estimates.",
  },
  {
    title: "Finalize the round",
    description:
      "Once the discussion is done, finalize the result and keep it in the session archive.",
  },
  {
    title: "Start the next round",
    description:
      "Optionally name the next story, start the next round, and repeat as long as the session lasts.",
  },
];

export function HelpPage({ theme, onToggleTheme }: HelpPageProps) {
  return (
    <section className="landing-workspace public-page">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <AppLogo />
          <div>
            <strong>LealPlanningPoker</strong>
            <span>Step-by-step guide</span>
          </div>
        </div>

        <div className="topbar-actions">
          <a className="button button--quiet button--link" href={HOME_PATH}>
            Home
          </a>
          <a
            className="button button--quiet button--link is-active"
            href={HELP_PATH}
            aria-current="page"
          >
            Help
          </a>
          <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
        </div>
      </header>

      <div className="public-page__main">
        <section className="workspace-panel help-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Guide</p>
              <h2>Step by step</h2>
            </div>
          </div>

          <ol className="help-steps">
            {HELP_STEPS.map((step, index) => (
              <li key={step.title} className="help-step">
                <span className="help-step__index">{index + 1}</span>
                <div className="help-step__copy">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace-panel help-cta">
          <div className="panel-heading">
            <div>
              <p className="section-label">Support</p>
              <h2>Questions, suggestions, or bug reports</h2>
            </div>
          </div>
          <p>
            If something is unclear or you want to suggest an improvement, send an email describing
            the question, suggestion, or bug and it will be looked at.
          </p>
          <div className="action-row">
            <a className="button button--primary button--link" href={`mailto:${SUPPORT_EMAIL}`}>
              Email support
            </a>
          </div>
        </section>

        <section className="workspace-panel help-cta">
          <div className="panel-heading">
            <div>
              <p className="section-label">Donate</p>
              <h2>Support the project</h2>
            </div>
          </div>
          <p>
            LealPlanningPoker is free. If it helps your team, you can chip in with a card on Ko-fi
            or with Pix through Livepix.
          </p>
          <div className="action-row">
            <a
              className="button button--secondary button--link"
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ko-fi
            </a>
            <a
              className="button button--secondary button--link"
              href={LIVEPIX_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pix (Livepix)
            </a>
          </div>
        </section>
      </div>

      <PublicFooter />
    </section>
  );
}
