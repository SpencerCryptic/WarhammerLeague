import Tabgroup from '@/components/Tabgroup';
import { error } from 'console';
import React from 'react'
import { RichText } from "@graphcms/rich-text-react-renderer";


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

  return (
    <div>
      <h1 className='mb-20 text-6xl'>
        {league.data.name}
      </h1>
  
      <div className="block max-w-6xl m-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
        <Tabgroup />
      </div>
  
      {league.data?.description && (
        <div className="max-w-6xl m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <RichText content={league.data.description} />
        </div>
      )}
    </div>
  )  
  
}  

export default League