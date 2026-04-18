# KORA Engineering Agent

[![arXiv:2507.23370](https://img.shields.io/badge/TechReport-arXiv%3A2507.23370-b31a1b)](https://arxiv.org/abs/2507.23370)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**KORA Engineering Agent** is the JahknowsPR / KORA–branded CLI for LLM-driven software engineering: natural-language tasks, file editing, bash, and multi-provider models. It is maintained as a **vendor copy** of [ByteDance trae-agent](https://github.com/bytedance/trae-agent) with KORA naming and defaults (see [UPSTREAM.md](UPSTREAM.md)).

For the original technical report see [arXiv:2507.23370](https://arxiv.org/abs/2507.23370).

**Upstream:** This tree tracks the open-source agent; pull upstream changes periodically or diff against `bytedance/trae-agent` when upgrading.

## ✨ Features

- 🌊 **Lakeview**: Provides short and concise summarisation for agent steps
- 🤖 **Multi-LLM Support**: Works with OpenAI, Anthropic, Doubao, Azure, OpenRouter, Ollama and Google Gemini APIs
- 🛠️ **Rich Tool Ecosystem**: File editing, bash execution, sequential thinking, and more
- 🎯 **Interactive Mode**: Conversational interface for iterative development
- 📊 **Trajectory Recording**: Detailed logging of all agent actions for debugging and analysis
- ⚙️ **Flexible Configuration**: YAML-based configuration with environment variable support
- 🚀 **Easy Installation**: Simple pip-based installation

## 🚀 Installation

### Requirements
- UV (https://docs.astral.sh/uv/)
- API key for your chosen provider (OpenAI, Anthropic, Google Gemini, OpenRouter, etc.)

### Setup

From the KORA monorepo this package lives at `KORA/services/kora-engineering-agent`. From that directory:

```bash
uv sync --all-extras
source .venv/bin/activate
```

## ⚙️ Configuration

### YAML Configuration (Recommended)

1. Copy the example configuration file:
   ```bash
   cp kora_eng_config.yaml.example kora_eng_config.yaml
   ```

2. Edit `kora_eng_config.yaml` with your API credentials and preferences:

```yaml
agents:
  kora_engineering_agent:
    enable_lakeview: true
    model: kora_engineering_agent_model  # the model configuration name for this agent
    max_steps: 200  # max number of agent steps
    tools:  # tools used with KORA Engineering Agent
      - bash
      - str_replace_based_edit_tool
      - sequentialthinking
      - task_done

model_providers:  # model providers configuration
  anthropic:
    api_key: your_anthropic_api_key
    provider: anthropic
  openai:
    api_key: your_openai_api_key
    provider: openai

models:
  kora_engineering_agent_model:
    model_provider: anthropic
    model: claude-sonnet-4-20250514
    max_tokens: 4096
    temperature: 0.5
```

**Note:** The `kora_eng_config.yaml` file is ignored by git to protect your API keys.

### Using Base URL
In some cases, we need to use a custom URL for the api. Just add the `base_url` field after `provider`, take the following config as an example:

```
openai:
    api_key: your_openrouter_api_key
    provider: openai
    base_url: https://openrouter.ai/api/v1
```
**Note:** For field formatting, use spaces only. Tabs (\t) are not allowed.

### Environment Variables (Alternative)

You can also configure API keys using environment variables and store them in the .env file:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_BASE_URL="your-openai-base-url"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export ANTHROPIC_BASE_URL="your-anthropic-base-url"
export GOOGLE_API_KEY="your-google-api-key"
export GOOGLE_BASE_URL="your-google-base-url"
export OPENROUTER_API_KEY="your-openrouter-api-key"
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
export DOUBAO_API_KEY="your-doubao-api-key"
export DOUBAO_BASE_URL="https://ark.cn-beijing.volces.com/api/v3/"
```

### MCP Services (Optional)

To enable Model Context Protocol (MCP) services, add an `mcp_servers` section to your configuration:

```yaml
mcp_servers:
  playwright:
    command: npx
    args:
      - "@playwright/mcp@0.0.27"
```

**Configuration Priority:** Command-line arguments > Configuration file > Environment variables > Default values

**Legacy JSON Configuration:** If using the older JSON format, see [docs/legacy_config.md](docs/legacy_config.md). We recommend migrating to YAML.

## 📖 Usage

### Basic Commands

```bash
# Simple task execution
kora-eng-cli run "Create a hello world Python script"

# Check configuration
kora-eng-cli show-config

# Interactive mode
kora-eng-cli interactive
```

### Provider-Specific Examples

```bash
# OpenAI
kora-eng-cli run "Fix the bug in main.py" --provider openai --model gpt-4o

# Anthropic
kora-eng-cli run "Add unit tests" --provider anthropic --model claude-sonnet-4-20250514

# Google Gemini
kora-eng-cli run "Optimize this algorithm" --provider google --model gemini-2.5-flash

# OpenRouter (access to multiple providers)
kora-eng-cli run "Review this code" --provider openrouter --model "anthropic/claude-3-5-sonnet"
kora-eng-cli run "Generate documentation" --provider openrouter --model "openai/gpt-4o"

# Doubao
kora-eng-cli run "Refactor the database module" --provider doubao --model doubao-seed-1.6

# Ollama (local models)
kora-eng-cli run "Comment this code" --provider ollama --model qwen3
```

### Advanced Options

```bash
# Custom working directory
kora-eng-cli run "Add tests for utils module" --working-dir /path/to/project

# Save execution trajectory
kora-eng-cli run "Debug authentication" --trajectory-file debug_session.json

# Force patch generation
kora-eng-cli run "Update API endpoints" --must-patch

# Interactive mode with custom settings
kora-eng-cli interactive --provider openai --model gpt-4o --max-steps 30
```

## Docker Mode Commands
### Preparation
**Important**: You need to make sure Docker is configured in your environment.

### Usage
```bash
# Specify a Docker image to run the task in a new container
kora-eng-cli run "Add tests for utils module" --docker-image python:3.11

# Specify a Docker image to run the task in a new container and mount the directory
kora-eng-cli run "write a script to print helloworld" --docker-image python:3.12 --working-dir test_workdir/

# Attach to an existing Docker container by ID (`--working-dir` is invalid with `--docker-container-id`)
kora-eng-cli run "Update API endpoints" --docker-container-id 91998a56056c

# Specify an absolute path to a Dockerfile to build an environment
kora-eng-cli run "Debug authentication" --dockerfile-path test_workspace/Dockerfile

# Specify a path to a local Docker image file (tar archive) to load
kora-eng-cli run "Fix the bug in main.py" --docker-image-file test_workspace/kora_eng_agent_custom.tar

# Remove the Docker container after finishing the task (keep default)
kora-eng-cli run "Add tests for utils module" --docker-image python:3.11 --docker-keep false
```

### Interactive Mode Commands

In interactive mode, you can use:
- Type any task description to execute it
- `status` - Show agent information
- `help` - Show available commands
- `clear` - Clear the screen
- `exit` or `quit` - End the session

## 🛠️ Advanced Features

### Available Tools

KORA Engineering Agent provides a comprehensive toolkit for software engineering tasks including file editing, bash execution, structured thinking, and task completion. For detailed information about all available tools and their capabilities, see [docs/tools.md](docs/tools.md).

### Trajectory Recording

KORA Engineering Agent automatically records detailed execution trajectories for debugging and analysis:

```bash
# Auto-generated trajectory file
kora-eng-cli run "Debug the authentication module"
# Saves to: trajectories/trajectory_YYYYMMDD_HHMMSS.json

# Custom trajectory file
kora-eng-cli run "Optimize database queries" --trajectory-file optimization_debug.json
```

Trajectory files contain LLM interactions, agent steps, tool usage, and execution metadata. For more details, see [docs/TRAJECTORY_RECORDING.md](docs/TRAJECTORY_RECORDING.md).

## 🔧 Development

### Contributing

For contribution guidelines, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

### Troubleshooting

**Import Errors:**
```bash
PYTHONPATH=. kora-eng-cli run "your task"
```

**API Key Issues:**
```bash
# Verify API keys
echo $OPENAI_API_KEY
kora-eng-cli show-config
```

**Command Not Found:**
```bash
uv run kora-eng-cli run "your task"
```

**Permission Errors:**
```bash
chmod +x /path/to/your/project
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ✍️ Citation

```bibtex
@article{traeresearchteam2025traeagent,
      title={Trae Agent: An LLM-based Agent for Software Engineering with Test-time Scaling},
      author={Trae Research Team and Pengfei Gao and Zhao Tian and Xiangxin Meng and Xinchen Wang and Ruida Hu and Yuanan Xiao and Yizhou Liu and Zhao Zhang and Junjie Chen and Cuiyun Gao and Yun Lin and Yingfei Xiong and Chao Peng and Xia Liu},
      year={2025},
      eprint={2507.23370},
      archivePrefix={arXiv},
      primaryClass={cs.SE},
      url={https://arxiv.org/abs/2507.23370},
}
```

## 🙏 Acknowledgments

We thank Anthropic for building the [anthropic-quickstart](https://github.com/anthropics/anthropic-quickstarts) project that served as a valuable reference for the tool ecosystem.
