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
                onChange={(e) => {
                  const newProvider = e.target.value as 'openai' | 'anthropic' | 'none';
                  setProvider(newProvider);
                  // Reset model to default when provider changes
                  if (newProvider === 'openai') {
                    setModel('gpt-4o');
                  } else if (newProvider === 'anthropic') {
                    setModel('claude-3-5-sonnet-20241022');
                  }
                }}
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
                  {provider === 'openai' ? (
                    <select
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="select-field"
                    >
                      <option value="gpt-4o">GPT-4o (Latest, Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-32k">GPT-4 32K (Long Context)</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cost-Effective)</option>
                      <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                      <option value="gpt-4-turbo-preview">GPT-4 Turbo Preview (Legacy)</option>
                    </select>
                  ) : provider === 'anthropic' ? (
                    <select
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="select-field"
                    >
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
                    </select>
                  ) : (
                    <input
                      id="model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Enter model name"
                      className="input-field"
                    />
                  )}
                  <p className="field-hint">
                    {provider === 'openai' 
                      ? 'Select the OpenAI model to use. GPT-4o offers the best balance of quality and speed.'
                      : provider === 'anthropic'
                      ? 'Select the Anthropic Claude model to use.'
                      : 'Enter the model name for your provider.'}
                  </p>
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








