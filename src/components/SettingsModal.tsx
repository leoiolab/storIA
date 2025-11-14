import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { AIConfig } from '../types';
import './Modal.css';

interface SettingsModalProps {
  isOpen: boolean;
  aiConfig: AIConfig;
  onClose: () => void;
  onSave: (config: AIConfig) => void;
}

function SettingsModal({ isOpen, aiConfig, onClose, onSave }: SettingsModalProps) {
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'none'>(aiConfig.provider);
  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [model, setModel] = useState(aiConfig.model);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setProvider(aiConfig.provider);
    setApiKey(aiConfig.apiKey);
    setModel(aiConfig.model);
  }, [aiConfig, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ provider, apiKey, model });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <h3>AI Configuration</h3>
            <p className="form-description">
              Configure AI assistance for character generation and writing suggestions.
            </p>

            <div className="form-group">
              <label htmlFor="provider">AI Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="select-field"
              >
                <option value="none">None (Disabled)</option>
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            {provider !== 'none' && (
              <>
                <div className="form-group">
                  <label htmlFor="apiKey">API Key</label>
                  <div className="input-with-icon">
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="input-field"
                    />
                    <button
                      className="icon-button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      type="button"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="field-hint">
                    Your API key is stored locally and never sent anywhere except to {provider === 'openai' ? 'OpenAI' : 'Anthropic'}.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="model">Model</label>
                  <input
                    id="model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={provider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-opus'}
                    className="input-field"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;






