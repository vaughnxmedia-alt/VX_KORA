# Copyright (c) 2025 ByteDance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""Tools module for KORA Engineering Agent."""

from kora_engineering_agent.tools.base import Tool, ToolCall, ToolExecutor, ToolResult
from kora_engineering_agent.tools.bash_tool import BashTool
from kora_engineering_agent.tools.ckg_tool import CKGTool
from kora_engineering_agent.tools.edit_tool import TextEditorTool
from kora_engineering_agent.tools.json_edit_tool import JSONEditTool
from kora_engineering_agent.tools.sequential_thinking_tool import SequentialThinkingTool
from kora_engineering_agent.tools.task_done_tool import TaskDoneTool

__all__ = [
    "Tool",
    "ToolResult",
    "ToolCall",
    "ToolExecutor",
    "BashTool",
    "TextEditorTool",
    "JSONEditTool",
    "SequentialThinkingTool",
    "TaskDoneTool",
    "CKGTool",
]

tools_registry: dict[str, type[Tool]] = {
    "bash": BashTool,
    "str_replace_based_edit_tool": TextEditorTool,
    "json_edit_tool": JSONEditTool,
    "sequentialthinking": SequentialThinkingTool,
    "task_done": TaskDoneTool,
    "ckg": CKGTool,
}
