export interface StoryPanelProps {
  storyDraft: string;
  canSetStory: boolean;
  isFinalized: boolean;
  busy: boolean;
  onStoryChange: (value: string) => void;
  onSaveStory: () => void;
}

export function StoryPanel({
  storyDraft,
  canSetStory,
  isFinalized,
  busy,
  onStoryChange,
  onSaveStory,
}: StoryPanelProps) {
  return (
    <section className="workspace-panel story-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Story</p>
          <h2>{canSetStory ? "Set the next round" : "Story locked"}</h2>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Story / ticket (optional)</span>
        <input
          className="field__input"
          disabled={!canSetStory}
          placeholder="Improve onboarding flow"
          value={storyDraft}
          onChange={(event) => onStoryChange(event.target.value)}
        />
      </label>

      <p className="field__hint">Name the round so everyone knows what you&apos;re estimating.</p>

      <div className="action-row">
        <button
          className="button button--secondary"
          disabled={busy || !canSetStory}
          type="button"
          onClick={onSaveStory}
        >
          {isFinalized ? "Start next round" : "Save story"}
        </button>
      </div>
    </section>
  );
}
