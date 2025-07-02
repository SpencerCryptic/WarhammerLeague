
import React from 'react'

const getLeague = async (documentId: string) => {
  const response = await fetch(`http://localhost:1337/api/leagues/${documentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch league");
  }

  return await response.json();
}

const League = async ({ params }: { params: any }) => {

  const { documentId } = await params
  const league = await getLeague(documentId);
  console.log(league.data)

  return (
    <div>
      {league.data.gameSystem}
    </div>
  )
}

export default League