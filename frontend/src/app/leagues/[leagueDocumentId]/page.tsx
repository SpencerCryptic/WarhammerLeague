import React from 'react';
import { RichText } from "@graphcms/rich-text-react-renderer";
import LeagueAdminControls from '@/components/LeagueAdminControls';
import JoinLeagueButton from '@/components/JoinLeagueButton';

const getLeague = async (documentId: string) => {
  const response = await fetch(`http://localhost:1337/api/leagues/${documentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch league");
  }

  return await response.json();
};

const League = async ({ params }: { params: any }) => {
  const { leagueDocumentId } = params;
  const league = await getLeague(leagueDocumentId);

  return (
    <div>
      {/* League Details */}
      <div className="max-w-6xl m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">League Details</h2>
        <ul className="space-y-2">
          <li>
            <strong>Organiser:</strong>{" "}
            {league.data?.createdByUser?.username || "Unknown"}
          </li>
          <li>
            <strong>Game System:</strong>{" "}
            {league.data?.gameSystem || "N/A"}
          </li>
          <li className="capitalize">
            <strong>Format:</strong>{" "}
            {league.data?.format
              ? league.data.format.replace("_", " ")
              : "N/A"}
          </li>
          <li>
            <strong>Start Date:</strong>{" "}
            {league.data?.startDate
              ? new Date(league.data.startDate).toLocaleString()
              : "Not set"}
          </li>
          <li>
            <strong>Status:</strong>{" "}
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              league.data?.statusleague === 'planned' ? 'bg-yellow-100 text-yellow-800' :
              league.data?.statusleague === 'ongoing' ? 'bg-green-100 text-green-800' :
              league.data?.statusleague === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {league.data?.statusleague || "Unknown"}
            </span>
          </li>
          <li>
            <strong>Players:</strong>{" "}
            {league.data?.league_players?.length || 0}
          </li>
        </ul>
      </div>

      {/* Admin Controls - Only visible to league owner */}
      <LeagueAdminControls 
        league={league.data} 
        documentId={leagueDocumentId} 
      />

      {/* League Description */}
      {league.data?.description && (
        <div className="max-w-6xl m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Description</h3>
          <RichText content={league.data.description} />
        </div>
      )}

      {/* Join League Section - Working functionality */}
      <JoinLeagueButton
        leagueId={leagueDocumentId}
        hasPassword={!!league.data?.leaguePassword}
        gameSystem={league.data?.gameSystem || ''}
        status={league.data?.statusleague || ''}
      />

      {/* League Status Messages */}
      {league.data?.statusleague === 'ongoing' && (
        <div className="max-w-6xl m-4 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm dark:bg-green-900/20 dark:border-green-700">
          <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
            ⚔️ League is Active!
          </h3>
          <p className="text-green-600 dark:text-green-300">
            This league is currently running. Check the Matches tab to see your games!
          </p>
        </div>
      )}

      {league.data?.statusleague === 'completed' && (
        <div className="max-w-6xl m-4 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900/20 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            🏆 League Completed
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            This league has finished. Check the Table tab to see final results!
          </p>
        </div>
      )}
    </div>
  );
};

export default League;