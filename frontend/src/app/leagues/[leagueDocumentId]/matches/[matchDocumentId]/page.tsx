import MatchComponent from '@/components/Match';
import React from 'react'



const Match = async ({ params }: { params: any }) => {
  const { matchDocumentId } = await params;

  return (
    <div>
     <MatchComponent></MatchComponent>
    </div>
  )
}

export default Match