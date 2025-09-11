/**
 * AI Provider Configuration System for Ant Colony TTRPG
 * Version: v0.3 - Centralized AI configuration management
 */

const fs = require('fs');
const path = require('path');

class AIConfig {
  constructor() {
    this.configPath = path.join(__dirname, '../config/ai-config.json');
    this.defaultConfig = {
      enabled: true,
      provider: 'mock',
      fallbackMode: true,
      providers: {
        mock: {
          enabled: true,
          description: "Built-in mock AI for testing and offline play"
        },
        openai: {
          enabled: false,
          apiKey: null,
          model: 'gpt-3.5-turbo',
          maxTokens: 150,
          temperature: 0.7,
          description: "OpenAI GPT models for dynamic narrative generation"
        },
        claude: {
          enabled: false,
          apiKey: null,
          model: 'claude-3-haiku-20240307',
          maxTokens: 150,
          temperature: 0.7,
          description: "Anthropic Claude models for sophisticated storytelling"
        },
        local: {
          enabled: false,
          endpoint: 'http://localhost:11434',
          model: 'llama2',
          description: "Local LLM via Ollama or similar service"
        }
      },
      narrative_preferences: {
        tone: 'dramatic', // 'dramatic', 'whimsical', 'scientific', 'dark'
        detail_level: 'medium', // 'minimal', 'medium', 'rich'
        perspective: 'ant_scale', // 'ant_scale', 'omniscient', 'human_observer'
        language_style: 'vivid' // 'simple', 'vivid', 'poetic', 'technical'
      },
      performance: {
        cache_narratives: true,
        max_retries: 2,
        timeout_ms: 5000,
        rate_limit_delay: 100
      }
    };
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const userConfig = JSON.parse(configData);
        return this.mergeConfigs(this.defaultConfig, userConfig);
      }
    } catch (error) {
      console.warn('Failed to load AI config, using defaults:', error.message);
    }
    
    return this.defaultConfig;
  }

  saveConfig(config) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save AI config:', error.message);
      return false;
    }
  }

  mergeConfigs(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    // Merge top-level properties
    Object.assign(merged, userConfig);
    
    // Deep merge providers and preferences
    if (userConfig.providers) {
      Object.assign(merged.providers, userConfig.providers);
    }
    
    if (userConfig.narrative_preferences) {
      Object.assign(merged.narrative_preferences, userConfig.narrative_preferences);
    }
    
    if (userConfig.performance) {
      Object.assign(merged.performance, userConfig.performance);
    }
    
    return merged;
  }

  validateConfig(config) {
    const errors = [];
    
    // Check if at least one provider is enabled
    const enabledProviders = Object.entries(config.providers)
      .filter(([name, settings]) => settings.enabled);
    
    if (enabledProviders.length === 0) {
      errors.push('At least one AI provider must be enabled');
    }
    
    // Validate OpenAI config if enabled
    if (config.providers.openai.enabled) {
      if (!config.providers.openai.apiKey) {
        errors.push('OpenAI API key is required when OpenAI provider is enabled');
      }
      if (!config.providers.openai.model) {
        errors.push('OpenAI model must be specified');
      }
    }
    
    // Validate Claude config if enabled
    if (config.providers.claude.enabled) {
      if (!config.providers.claude.apiKey) {
        errors.push('Claude API key is required when Claude provider is enabled');
      }
    }
    
    // Validate local config if enabled
    if (config.providers.local.enabled) {
      if (!config.providers.local.endpoint) {
        errors.push('Local LLM endpoint must be specified');
      }
      if (!config.providers.local.model) {
        errors.push('Local LLM model must be specified');
      }
    }
    
    return errors;
  }

  getActiveProvider(config) {
    if (!config.enabled) {
      return null;
    }
    
    // Use specified provider if valid and enabled
    if (config.provider && 
        config.providers[config.provider] && 
        config.providers[config.provider].enabled) {
      return config.provider;
    }
    
    // Fall back to first enabled provider
    for (const [name, settings] of Object.entries(config.providers)) {
      if (settings.enabled) {
        return name;
      }
    }
    
    return 'mock'; // Ultimate fallback
  }

  createProviderConfig(configData, providerName = null) {
    const config = configData || this.loadConfig();
    const provider = providerName || this.getActiveProvider(config);
    
    if (!provider) {
      return { enabled: false };
    }
    
    const providerConfig = {
      enabled: config.enabled,
      provider: provider,
      fallbackMode: config.fallbackMode,
      ...config.providers[provider],
      narrative_preferences: config.narrative_preferences,
      performance: config.performance
    };
    
    return providerConfig;
  }

  setupInteractiveConfig() {
    console.log('\n🤖 AI GameMaster Configuration Setup');
    console.log('=====================================');
    
    const config = this.loadConfig();
    
    console.log('\nAvailable AI Providers:');
    for (const [name, settings] of Object.entries(config.providers)) {
      const status = settings.enabled ? '✅' : '❌';
      console.log(`  ${status} ${name}: ${settings.description}`);
    }
    
    console.log('\nTo configure AI providers:');
    console.log('1. Edit config/ai-config.json');
    console.log('2. Set API keys for desired providers');
    console.log('3. Enable/disable providers as needed');
    console.log('4. Customize narrative preferences');
    
    console.log('\nExample configuration:');
    console.log(JSON.stringify({
      enabled: true,
      provider: 'openai',
      providers: {
        openai: {
          enabled: true,
          apiKey: 'your-api-key-here',
          model: 'gpt-3.5-turbo'
        }
      }
    }, null, 2));
    
    return config;
  }

  getProviderStatus() {
    const config = this.loadConfig();
    const activeProvider = this.getActiveProvider(config);
    
    return {
      enabled: config.enabled,
      activeProvider: activeProvider,
      fallbackMode: config.fallbackMode,
      providersAvailable: Object.keys(config.providers).length,
      providersEnabled: Object.values(config.providers).filter(p => p.enabled).length
    };
  }
}

// CLI interface for configuration
if (require.main === module) {
  const aiConfig = new AIConfig();
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      aiConfig.setupInteractiveConfig();
      break;
      
    case 'status':
      const status = aiConfig.getProviderStatus();
      console.log('AI GameMaster Status:', status);
      break;
      
    case 'test':
      const config = aiConfig.loadConfig();
      const errors = aiConfig.validateConfig(config);
      if (errors.length > 0) {
        console.log('Configuration errors:', errors);
      } else {
        console.log('Configuration is valid ✅');
      }
      break;
      
    default:
      console.log('AI Config Management');
      console.log('Usage: node ai-config.js [setup|status|test]');
      console.log('  setup  - Interactive configuration guide');
      console.log('  status - Show current AI provider status');
      console.log('  test   - Validate current configuration');
  }
}

module.exports = AIConfig;