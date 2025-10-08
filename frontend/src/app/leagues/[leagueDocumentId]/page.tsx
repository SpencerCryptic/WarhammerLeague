import React from 'react';
import { RichText } from "@graphcms/rich-text-react-renderer";
import LeagueAdminControls from '@/components/LeagueAdminControls';
import JoinLeagueButton from '@/components/JoinLeagueButton';

const getLeague = async (documentId: string) => {
  try {
    const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}`);

    if (!response.ok) {
      console.error(`Failed to fetch league: ${response.status}`);
      return { data: null };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch league:', error);
    return { data: null };
  }
};

const League = async ({ params }: { params: any }) => {
  const { leagueDocumentId } = params;
  const league = await getLeague(leagueDocumentId);

  if (!league.data) {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-4">League Not Found</h2>
          <p className="text-red-600 dark:text-red-400">
            Unable to load league data. This could be because the league doesn't exist or the server is not available.
          </p>
          <p className="text-sm text-red-500 dark:text-red-400 mt-2">
            Please check that the backend server is running and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Join League Section */}
      <JoinLeagueButton
        leagueId={leagueDocumentId}
        hasPassword={!!league.data?.leaguePassword}
        gameSystem={league.data?.gameSystem || ''}
        status={league.data?.statusleague || ''}
      />

      {/* League Details Card */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <span className="w-1 h-8 bg-orange-500 mr-3 rounded-full"></span>
          League Details
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Organiser:</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {league.data?.createdByUser?.username || "Unknown"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Game System:</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {league.data?.gameSystem || "N/A"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Format:</span>
              <span className="text-gray-900 dark:text-white font-semibold capitalize">
                {league.data?.format
                  ? league.data.format.replace("_", " ")
                  : "N/A"}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Start Date:</span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {league.data?.startDate
                  ? new Date(league.data.startDate).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : "Not set"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Status:</span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                league.data?.statusleague === 'planned' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                league.data?.statusleague === 'ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                league.data?.statusleague === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {league.data?.statusleague || "Unknown"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[120px]">Players:</span>
              <span className="text-gray-900 dark:text-white">
                <span className="font-bold text-2xl">{league.data?.league_players?.length || 0}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ {league.data?.maxPlayers || '∞'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls - Only visible to league owner */}
      <LeagueAdminControls 
        league={league.data} 
        documentId={leagueDocumentId} 
      />

      {/* League Description */}
      {league.data?.description && (
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="w-1 h-8 bg-orange-500 mr-3 rounded-full"></span>
            Description
          </h3>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <RichText content={league.data.description} />
          </div>
        </div>
      )}

      {/* League Status Messages */}
      {league.data?.statusleague === 'ongoing' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-xl shadow-lg p-8 mb-6 border border-green-200 dark:border-green-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <h3 className="text-2xl font-bold mb-3 text-green-800 dark:text-green-300 flex items-center">
              <span className="text-3xl mr-3">⚔️</span>
              League is Active!
            </h3>
            <p className="text-lg text-green-700 dark:text-green-400">
              This league is currently running. Check the Matches tab to see your games!
            </p>
          </div>
        </div>
      )}

      {league.data?.statusleague === 'completed' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 rounded-xl shadow-lg p-8 mb-6 border border-blue-200 dark:border-blue-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <h3 className="text-2xl font-bold mb-3 text-blue-800 dark:text-blue-300 flex items-center">
              <span className="text-3xl mr-3">🏆</span>
              League Completed
            </h3>
            <p className="text-lg text-blue-700 dark:text-blue-400">
              This league has finished. Check the Table tab to see final results!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default League;