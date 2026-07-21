import { JournalPageHeader } from "../../_components/JournalPageHeader";
import { JournalShell } from "../../_components/JournalShell";

export default function JournalHabitsPage() {
  return (
    <JournalShell activeNav="habits" headerTitle="Habits">
      <JournalPageHeader title="Habit tracker" subtitle="Build consistency with streaks">
        <button type="button" className="jrn-btn-primary">New habit</button>
      </JournalPageHeader>
      <section className="jrn-card">
        <div className="jrn-table-wrap border-0">
          <table className="jrn-table">
            <thead>
              <tr>
                <th>Habit</th>
                <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Morning journal</td>
                <td>✓</td><td>✓</td><td>✓</td><td>—</td><td>✓</td><td>✓</td><td>—</td>
                <td>12🔥</td>
              </tr>
              <tr>
                <td className="font-medium">Exercise</td>
                <td>✓</td><td>—</td><td>✓</td><td>✓</td><td>—</td><td>✓</td><td>✓</td>
                <td>5🔥</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </JournalShell>
  );
}
