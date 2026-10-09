"use client";

import { useEffect } from "react";
import { BookOpen, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import {
  InfoRow,
  SectionLoading,
  SettingRow,
  SettingsGroup,
} from "@/components/settings/settings-ui";
import { useTutorial } from "@/components/tutorial/tutorial-provider";
import { formatDateTime } from "@/lib/format";

export function TutorialSection() {
  const { payload, loading, error, steps, start, refresh } = useTutorial();

  // Progress may have changed on another device since sign-in.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const progress = payload?.progress;
  const viewed = progress
    ? steps.filter((step) => progress.viewed_steps.includes(step.id)).length
    : 0;
  const completed = progress?.status === "completed";
  const inProgress = progress?.status === "in_progress";

  const statusText = !progress
    ? "—"
    : completed
      ? `Completed${progress.completed_at ? ` · ${formatDateTime(progress.completed_at)}` : ""}`
      : inProgress
        ? `In progress · ${viewed} of ${steps.length} steps seen`
        : "Not started";

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="App tutorial"
        description="A short guided tour of Opal's main screens. It opens after you sign in until you finish it, and you can replay it here anytime."
      >
        {!payload && loading ? (
          <SectionLoading rows={2} />
        ) : !payload && error ? (
          <div className="py-3">
            <Alert
              tone="warning"
              title="Tutorial unavailable"
              description="Connect to the internet to load the tutorial, then try again."
            />
          </div>
        ) : (
          <>
            <InfoRow label="Status" value={statusText} />
            <SettingRow
              label={
                completed
                  ? "Replay the tour"
                  : inProgress
                    ? "Start over"
                    : "Take the tour"
              }
              description={
                completed
                  ? "Walk through the main screens again from the first step. The tutorial stays marked as completed."
                  : "Start from the first step. It takes about two minutes."
              }
            >
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  variant={completed ? "secondary" : "primary"}
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={!payload && !!error}
                  onClick={() => start({ restart: true })}
                >
                  {completed || inProgress ? (
                    <RotateCcw size={15} aria-hidden />
                  ) : (
                    <PlayCircle size={15} aria-hidden />
                  )}
                  {completed || inProgress
                    ? "Restart tutorial"
                    : "Start tutorial"}
                </Button>
              </div>
            </SettingRow>
          </>
        )}
      </SettingsGroup>

      <SettingsGroup
        title="Documentation"
        description="Step-by-step guides for every module, from accounts to the AI Advisor."
      >
        <SettingRow
          label="Open the user guide"
          description="Opens in your browser."
        >
          <div className="flex sm:justify-end">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                void import("@/lib/docs/portal").then(({ openDocumentation }) =>
                  openDocumentation(),
                );
              }}
            >
              <BookOpen size={15} aria-hidden />
              Open documentation
            </Button>
          </div>
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
