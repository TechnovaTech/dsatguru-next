import { useState, useEffect } from "react";
import { FiSave, FiUpload, FiShield, FiBell, FiGlobe, FiMail } from "react-icons/fi";

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    general: {
      siteName: "DSATGURU",
      siteDescription: "Premier online education platform for DSAT/PSAT preparation",
      contactEmail: "admin@dsatguru.com",
      supportPhone: "+1-555-0123",
      timezone: "UTC-5",
      language: "en"
    },
    branding: {
      logo: null,
      favicon: null,
      primaryColor: "#3B82F6",
      secondaryColor: "#10B981",
      fontFamily: "Inter"
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: true,
      systemAlerts: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      requirePasswordChange: false
    },
    integrations: {
      googleAnalytics: "",
      zoomApiKey: "",
      stripePublishableKey: "",
      emailProvider: "smtp"
    }
  });

  const tabs = [
    { id: "general", label: "General", icon: <FiGlobe /> },
    { id: "branding", label: "Branding", icon: <FiUpload /> },
    { id: "notifications", label: "Notifications", icon: <FiBell /> },
    { id: "security", label: "Security", icon: <FiShield /> },
    { id: "integrations", label: "Integrations", icon: <FiMail /> }
  ];

  const handleSave = () => {
    // Simulate API call
    console.log("Saving settings:", settings);
    alert("Settings saved successfully!");
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FiSave /> Save Changes
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow p-4">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {activeTab === "general" && (
            <GeneralSettings
              settings={settings.general}
              updateSetting={(key, value) => updateSetting("general", key, value)}
            />
          )}
          {activeTab === "branding" && (
            <BrandingSettings
              settings={settings.branding}
              updateSetting={(key, value) => updateSetting("branding", key, value)}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationSettings
              settings={settings.notifications}
              updateSetting={(key, value) => updateSetting("notifications", key, value)}
            />
          )}
          {activeTab === "security" && (
            <SecuritySettings
              settings={settings.security}
              updateSetting={(key, value) => updateSetting("security", key, value)}
            />
          )}
          {activeTab === "integrations" && (
            <IntegrationSettings
              settings={settings.integrations}
              updateSetting={(key, value) => updateSetting("integrations", key, value)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const GeneralSettings = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">General Settings</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Site Name</label>
        <input
          type="text"
          value={settings.siteName}
          onChange={(e) => updateSetting("siteName", e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Contact Email</label>
        <input
          type="email"
          value={settings.contactEmail}
          onChange={(e) => updateSetting("contactEmail", e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Support Phone</label>
        <input
          type="tel"
          value={settings.supportPhone}
          onChange={(e) => updateSetting("supportPhone", e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Timezone</label>
        <select
          value={settings.timezone}
          onChange={(e) => updateSetting("timezone", e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="UTC-5">Eastern Time (UTC-5)</option>
          <option value="UTC-6">Central Time (UTC-6)</option>
          <option value="UTC-7">Mountain Time (UTC-7)</option>
          <option value="UTC-8">Pacific Time (UTC-8)</option>
        </select>
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Site Description</label>
      <textarea
        value={settings.siteDescription}
        onChange={(e) => updateSetting("siteDescription", e.target.value)}
        className="w-full border rounded px-3 py-2"
        rows="3"
      />
    </div>
  </div>
);

const BrandingSettings = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Branding Settings</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Primary Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={settings.primaryColor}
            onChange={(e) => updateSetting("primaryColor", e.target.value)}
            className="w-12 h-10 border rounded"
          />
          <input
            type="text"
            value={settings.primaryColor}
            onChange={(e) => updateSetting("primaryColor", e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Secondary Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={settings.secondaryColor}
            onChange={(e) => updateSetting("secondaryColor", e.target.value)}
            className="w-12 h-10 border rounded"
          />
          <input
            type="text"
            value={settings.secondaryColor}
            onChange={(e) => updateSetting("secondaryColor", e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
        </div>
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Font Family</label>
      <select
        value={settings.fontFamily}
        onChange={(e) => updateSetting("fontFamily", e.target.value)}
        className="w-full border rounded px-3 py-2"
      >
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Poppins">Poppins</option>
      </select>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Logo Upload</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-600">Click to upload logo</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Favicon Upload</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-600">Click to upload favicon</p>
        </div>
      </div>
    </div>
  </div>
);

const NotificationSettings = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Notification Settings</h2>
    <div className="space-y-4">
      {Object.entries(settings).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
          <div>
            <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
            <p className="text-sm text-gray-600">
              {key === 'emailNotifications' && 'Send email notifications to users'}
              {key === 'smsNotifications' && 'Send SMS notifications to users'}
              {key === 'pushNotifications' && 'Send push notifications to mobile apps'}
              {key === 'marketingEmails' && 'Send marketing and promotional emails'}
              {key === 'systemAlerts' && 'Send system alerts and maintenance notifications'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateSetting(key, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      ))}
    </div>
  </div>
);

const SecuritySettings = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Security Settings</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
        <input
          type="number"
          value={settings.sessionTimeout}
          onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Password Min Length</label>
        <input
          type="number"
          value={settings.passwordMinLength}
          onChange={(e) => updateSetting("passwordMinLength", parseInt(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Max Login Attempts</label>
        <input
          type="number"
          value={settings.maxLoginAttempts}
          onChange={(e) => updateSetting("maxLoginAttempts", parseInt(e.target.value))}
          className="w-full border rounded px-3 py-2"
        />
      </div>
    </div>
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
        <div>
          <h4 className="font-medium">Two-Factor Authentication</h4>
          <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.twoFactorAuth}
            onChange={(e) => updateSetting("twoFactorAuth", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  </div>
);

const IntegrationSettings = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Integration Settings</h2>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Google Analytics ID</label>
        <input
          type="text"
          value={settings.googleAnalytics}
          onChange={(e) => updateSetting("googleAnalytics", e.target.value)}
          placeholder="GA-XXXXXXXXX-X"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Zoom API Key</label>
        <input
          type="text"
          value={settings.zoomApiKey}
          onChange={(e) => updateSetting("zoomApiKey", e.target.value)}
          placeholder="Enter Zoom API Key"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Stripe Publishable Key</label>
        <input
          type="text"
          value={settings.stripePublishableKey}
          onChange={(e) => updateSetting("stripePublishableKey", e.target.value)}
          placeholder="pk_live_..."
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Email Provider</label>
        <select
          value={settings.emailProvider}
          onChange={(e) => updateSetting("emailProvider", e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="mailgun">Mailgun</option>
          <option value="ses">Amazon SES</option>
        </select>
      </div>
    </div>
  </div>
);

export default SystemSettings;