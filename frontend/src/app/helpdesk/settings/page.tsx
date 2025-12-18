'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface HelpdeskSettings {
  documentId?: string;
  autoResponseEnabled: boolean;
  autoResponseMessage: string;
  autoCloseEnabled: boolean;
  autoCloseDays: number;
  autoCloseMessage: string;
  resolvedMessageEnabled: boolean;
  resolvedMessage: string;
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: string[];
  outOfHoursMessage: string;
  signatureEnabled: boolean;
  emailSignature: string;
  satisfactionSurveyEnabled: boolean;
  satisfactionSurveyMessage: string;
}

const defaultSettings: HelpdeskSettings = {
  autoResponseEnabled: true,
  autoResponseMessage: 'Thank you for contacting Cryptic Cabin support! We have received your message and will respond as soon as possible.\n\nIn the meantime, you may find answers to common questions on our website.\n\nBest regards,\nThe Cryptic Cabin Team',
  autoCloseEnabled: true,
  autoCloseDays: 7,
  autoCloseMessage: 'This ticket has been automatically closed due to inactivity. If you still need assistance, please reply to this email and we will reopen your ticket.\n\nThank you,\nThe Cryptic Cabin Team',
  resolvedMessageEnabled: true,
  resolvedMessage: 'Your support ticket has been marked as resolved. If you have any further questions or if this issue persists, please reply to this email.\n\nThank you for contacting Cryptic Cabin support!',
  businessHoursEnabled: false,
  businessHoursStart: '09:00',
  businessHoursEnd: '17:00',
  businessDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  outOfHoursMessage: 'Thank you for your message. Our support team is currently offline and will respond during business hours (Monday-Friday, 9am-5pm GMT).',
  signatureEnabled: true,
  emailSignature: 'Best regards,\nThe Cryptic Cabin Support Team\n\nCryptic Cabin\nhttps://crypticcabin.com',
  satisfactionSurveyEnabled: false,
  satisfactionSurveyMessage: 'We hope we were able to help you! Please take a moment to rate your support experience by replying with a number from 1 (poor) to 5 (excellent).'
};

const weekdays = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' }
];

export default function HelpdeskSettingsPage() {
  const [settings, setSettings] = useState<HelpdeskSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/helpdesk-setting`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setSettings({
            ...defaultSettings,
            ...data.data,
            businessDays: data.data.businessDays || defaultSettings.businessDays,
            // Convert time format from Strapi (HH:mm:ss.SSS) to display (HH:mm)
            businessHoursStart: data.data.businessHoursStart ? data.data.businessHoursStart.substring(0, 5) : defaultSettings.businessHoursStart,
            businessHoursEnd: data.data.businessHoursEnd ? data.data.businessHoursEnd.substring(0, 5) : defaultSettings.businessHoursEnd
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert HH:mm to HH:mm:ss.SSS format for Strapi
  const formatTimeForStrapi = (time: string) => {
    if (!time) return null;
    // If already in full format, return as-is
    if (time.includes('.')) return time;
    // Convert HH:mm to HH:mm:ss.SSS
    return `${time}:00.000`;
  };

  // Convert HH:mm:ss.SSS to HH:mm for display
  const formatTimeForDisplay = (time: string) => {
    if (!time) return '';
    // Extract just HH:mm
    return time.substring(0, 5);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Prepare data with properly formatted times
      const dataToSave = {
        ...settings,
        businessHoursStart: formatTimeForStrapi(settings.businessHoursStart),
        businessHoursEnd: formatTimeForStrapi(settings.businessHoursEnd)
      };

      const response = await fetch(`${API_URL}/api/helpdesk-setting`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: dataToSave })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error?.message || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const toggleBusinessDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      businessDays: prev.businessDays.includes(day)
        ? prev.businessDays.filter(d => d !== day)
        : [...prev.businessDays, day]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/helpdesk" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          &larr; Back to tickets
        </Link>
        <h1 className="text-3xl font-bold text-white">Helpdesk Settings</h1>
        <p className="text-gray-400 mt-1">Configure automated responses and ticket management</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Auto-Response Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Auto-Response</h2>
              <p className="text-gray-400 text-sm">Automatically reply when a new ticket is created</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoResponseEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, autoResponseEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.autoResponseEnabled && (
            <textarea
              value={settings.autoResponseMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, autoResponseMessage: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              rows={6}
              placeholder="Enter auto-response message..."
            />
          )}
        </section>

        {/* Auto-Close Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Auto-Close Inactive Tickets</h2>
              <p className="text-gray-400 text-sm">Automatically close tickets after no customer response</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoCloseEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, autoCloseEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.autoCloseEnabled && (
            <>
              <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-2">Days before auto-close</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.autoCloseDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoCloseDays: parseInt(e.target.value) || 7 }))}
                  className="w-24 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <label className="text-gray-400 text-sm block mb-2">Message sent when ticket is auto-closed</label>
              <textarea
                value={settings.autoCloseMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, autoCloseMessage: e.target.value }))}
                className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                rows={4}
                placeholder="Enter auto-close message..."
              />
            </>
          )}
        </section>

        {/* Resolved Message Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Resolved Notification</h2>
              <p className="text-gray-400 text-sm">Send message when ticket is marked as resolved</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.resolvedMessageEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, resolvedMessageEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.resolvedMessageEnabled && (
            <textarea
              value={settings.resolvedMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, resolvedMessage: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              rows={4}
              placeholder="Enter resolved message..."
            />
          )}
        </section>

        {/* Business Hours Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Business Hours</h2>
              <p className="text-gray-400 text-sm">Set operating hours for automated out-of-office replies</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.businessHoursEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, businessHoursEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.businessHoursEnabled && (
            <>
              <div className="flex gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Start Time</label>
                  <input
                    type="time"
                    value={settings.businessHoursStart}
                    onChange={(e) => setSettings(prev => ({ ...prev, businessHoursStart: e.target.value }))}
                    className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">End Time</label>
                  <input
                    type="time"
                    value={settings.businessHoursEnd}
                    onChange={(e) => setSettings(prev => ({ ...prev, businessHoursEnd: e.target.value }))}
                    className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-2">Business Days</label>
                <div className="flex gap-2">
                  {weekdays.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => toggleBusinessDay(day.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        settings.businessDays.includes(day.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="text-gray-400 text-sm block mb-2">Out of hours message</label>
              <textarea
                value={settings.outOfHoursMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, outOfHoursMessage: e.target.value }))}
                className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Enter out of hours message..."
              />
            </>
          )}
        </section>

        {/* Email Signature Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Email Signature</h2>
              <p className="text-gray-400 text-sm">Append signature to all outgoing emails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.signatureEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, signatureEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.signatureEnabled && (
            <textarea
              value={settings.emailSignature}
              onChange={(e) => setSettings(prev => ({ ...prev, emailSignature: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              rows={4}
              placeholder="Enter email signature..."
            />
          )}
        </section>

        {/* Satisfaction Survey Section */}
        <section className="rounded-xl border p-6" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Satisfaction Survey</h2>
              <p className="text-gray-400 text-sm">Send survey after ticket is resolved</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.satisfactionSurveyEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, satisfactionSurveyEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {settings.satisfactionSurveyEnabled && (
            <textarea
              value={settings.satisfactionSurveyMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, satisfactionSurveyMessage: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg p-4 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Enter survey message..."
            />
          )}
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
