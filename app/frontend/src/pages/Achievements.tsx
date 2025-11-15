import AchievementSystem from '../components/AchievementSystem';

export default function Achievements() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Achievements</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your milestones and unlock achievements
        </p>
      </div>

      <AchievementSystem />
    </div>
  );
}
