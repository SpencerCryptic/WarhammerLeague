'use client';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'

const MatchComponent = () => {
  const [match, setMatch] = useState<any>()
  const [activeList, setactiveList] = useState({player: 0})
  const [player1Score, setPlayer1Score] = useState<number | null>(null)
  const [player2Score, setPlayer2Score] = useState<number | null>(null)
  const [sumbitResponse, setSubmitResponse] = useState()

  const handleSubmit = async () => {
    try {
      const res = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/matches/${match.documentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaguePlayer1Score: player1Score,
          leaguePlayer2Score: player2Score
        }),
      });

      const data = await res.json();
      setSubmitResponse(data);
    } catch (error) {
      console.error('Error posting data:', error);
    }
  }

  const fetchMatch = (matchId: string) => {
    useEffect(() => {
      fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/matches/${matchId}`)
      .then((res) => res.json())
      .then((data) => {
        setMatch(data.data);
      });
    }, []) 
  }

  const copylist = (event: React.MouseEvent<HTMLButtonElement>, list: string) => {
    navigator.clipboard.writeText(list)
  }

  const pathName: string[] = usePathname().split('/')
  const matchDocumentId = pathName[4]
  const user =  localStorage.getItem('user')
  fetchMatch(matchDocumentId);  

  const renderListView = () => {
    switch (activeList.player) {
      case 0:
        return (
          <div>
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
              <tbody>
                <tr>
                  <td className='px-3 py-4'>
                    <p className='text-white text-lg'>{match.leaguePlayer1.leagueName}</p>
                    <p>{match.leaguePlayer1.faction}</p>
                  </td>
                  <td className='px-3 py-4'>
                    {
                      match.statusMatch === 'played' ?
                      <div>
                        <p>Score: {match.leaguePlayer2Score}</p>
                      </div>
                      :
                      <div className='flex'>
                        <p>Score:</p>
                        <input type="text" pattern="[0-9]" className='w-15 ml-3 px-3 rounded-full border border-gray-400' onChange={(e) => setPlayer1Score(parseInt(e.target.value))}></input>
                      </div>
                    }
                  </td>
                  <td className='px-3 py-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
                    <button type='button' onClick={(e) => setactiveList({ player: 1 })}>
                      View List
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className='px-3 py-4'>
                    <p className='text-white text-lg'>{match.leaguePlayer2.leagueName}</p>
                    <p>{match.leaguePlayer2.faction}</p>
                  </td>
                  <td className='px-3 py-4'>
                    {
                      match.statusMatch === 'played' ?
                      <div>
                        <p>Score: {match.leaguePlayer2Score}</p>
                      </div>
                      :
                      <div className='flex'>
                        <p>Score:</p>
                        <input type="text" pattern="[0-9]" className='w-15 ml-3 px-3 rounded-full border border-gray-400' onChange={(e) => setPlayer2Score(parseInt(e.target.value))}></input>
                      </div>
                    }
                  </td>
                  <td className='px-3 py-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
                    <button type='button' onClick={(e) => setactiveList({ player: 2 })}>
                      View List
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            {
              (match.statusMatch === 'planned' || match.statusMatch === 'upcoming') && 
              (user && (match.leaguePlayer1.player.email === JSON.parse(user).email 
              || match.leaguePlayer2.player.email === JSON.parse(user).email) ) ?
              <div>
                <div className='flex px-3'>
                  <input type='checkbox' id='agreeLists'></input>
                  <label className='ml-3'>Both Players Confirm that both lists submitted are from the game played</label>
                </div>
                <button type='button' className='border p-3 mt-3 border-gray-400 rounded-full hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'
                onClick={(e) => handleSubmit()}>
                  Submit
                </button>
              </div>
              :''
            }
            
          </div>
        )  
      case 1: 
      return (
        <div className='max-w-6xl mx-auto'>
          <div className='flex'>
            <div className='mb-4 mx-5 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => setactiveList({ player: 0 })}>
                Back
              </button>
            </div>
            <h1 className='ml-auto text-2xl capitalize'>
              {
                match.leaguePlayer1.leagueName
              }
            </h1>
            <div className='ml-auto mb-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => copylist(e, match.leaguePlayer1.playList)}>
                Copy
              </button>
            </div>
          </div>
          <p className="block whitespace-pre-wrap p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700">
            {
              match.leaguePlayer1.playList
            }
          </p>
        </div>
      );
      case 2: 
      return (
        <div className='max-w-6xl mx-auto'>
          <div className='flex'>
            <div className='mb-4 mx-5 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => setactiveList({player: 0})}>
                Back
              </button>
            </div>
            <h1 className='ml-auto text-2xl capitalize'>
              {
                match.leaguePlayer2.leagueName
              }
            </h1>
            <div className='ml-auto mb-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => copylist(e, match.leaguePlayer2.playList)}>
                Copy
              </button>
            </div>
          </div>
          <p className="block whitespace-pre-wrap p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700">
            {
              match.leaguePlayer2.playList
            }
          </p>
        </div>
      );
    }
  }

  return (
    <div>
      {
        match ?
        <div>
          {renderListView()}
        </div>
        :
        'Match not Found'
      }
      
    </div>
  )
}

export default MatchComponent