'use client';
import { useState, useEffect } from 'react';

interface ArmyList {
  id: string;
  name: string;
  faction: string;
  listContent: string;
  isActive: boolean;
  createdDate: string;
}

interface ArmyListManagerProps {
  leaguePlayerId: string;
  currentFaction: string;
  onClose: () => void;
}

export default function ArmyListManager({ leaguePlayerId, currentFaction, onClose }: ArmyListManagerProps) {
  const [lists, setLists] = useState<ArmyList[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newList, setNewList] = useState({
    name: '',
    faction: currentFaction,
    listContent: ''
  });

  useEffect(() => {
    fetchLists();
  }, [leaguePlayerId]);

  const fetchLists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${leaguePlayerId}?populate=*`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const armyLists = data.data?.armyLists || [];
        setLists(armyLists);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name.trim() || !newList.listContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      
      // Generate unique ID for the new list
      // Deactivate all existing lists since only one can be active
      const deactivatedLists = lists.map(list => ({ ...list, isActive: false }));
      
      const newListItem: ArmyList = {
        id: `list_${Date.now()}`,
        name: newList.name,
        faction: currentFaction, // Always use the league faction
        listContent: newList.listContent,
        isActive: true, // New list is automatically active
        createdDate: new Date().toISOString()
      };

      const updatedLists = [...deactivatedLists, newListItem];

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${leaguePlayerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            armyLists: updatedLists
          }
        })
      });

      if (response.ok) {
        setNewList({ name: '', faction: currentFaction, listContent: '' });
        setShowAddForm(false);
        fetchLists(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding list:', error);
    }
  };

  const toggleListStatus = async (listId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      // If activating a list, deactivate all others first (only one active at a time)
      const updatedLists = lists.map(list => {
        if (list.id === listId) {
          return { ...list, isActive: !currentStatus };
        } else if (!currentStatus) {
          // If we're activating the clicked list, deactivate all others
          return { ...list, isActive: false };
        } else {
          // If we're deactivating the clicked list, keep others as they are
          return list;
        }
      });

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${leaguePlayerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            armyLists: updatedLists
          }
        })
      });

      if (response.ok) {
        fetchLists(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      const token = localStorage.getItem('token');
      const updatedLists = lists.filter(list => list.id !== listId);

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${leaguePlayerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            armyLists: updatedLists
          }
        })
      });

      if (response.ok) {
        fetchLists(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
          <div className="text-center">Loading lists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Army List Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Add New List Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-6 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Army List
            </button>
          )}

          {/* Add List Form */}
          {showAddForm && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add New List</h3>
              <form onSubmit={handleAddList}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    List Name
                  </label>
                  <input
                    type="text"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Tournament List 2025"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Faction (locked to league faction)
                  </label>
                  <input
                    type="text"
                    value={currentFaction}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Copy and paste or type your list below
                  </label>
                  <textarea
                    value={newList.listContent}
                    onChange={(e) => setNewList({ ...newList, listContent: e.target.value })}
                    className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white font-mono text-sm"
                    placeholder="Paste your army list here..."
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors duration-200"
                  >
                    Save List
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Existing Lists */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Army Lists</h3>
            {lists.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No army lists yet. Add your first list above!
              </div>
            ) : (
              lists.map((list) => (
                <div
                  key={list.id}
                  className={`border rounded-lg p-4 ${
                    list.isActive
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{list.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{list.faction}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Created: {new Date(list.createdDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleListStatus(list.id, list.isActive)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          list.isActive
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {list.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteList(list.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded p-3">
                    <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {list.listContent}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}