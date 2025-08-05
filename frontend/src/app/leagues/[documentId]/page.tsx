import React from 'react';
import { RichText } from "@graphcms/rich-text-react-renderer";


const getLeague = async (documentId: string) => {
  const response = await fetch(`http://localhost:1337/api/leagues/${documentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch league");
  }

  return await response.json();
};

const League = async ({ params }: { params: any }) => {
  const { documentId } = params;
  const league = await getLeague(documentId);

  return (
    <div>
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
            <strong>Players:</strong>{" "}
            {league.data?.league_players?.length || 0}
          </li>
        </ul>
      </div>

      {league.data?.description && (
        <div className="max-w-6xl m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <RichText content={league.data.description} />
        </div>
      )}
    </div>
  );
};

export default League;
