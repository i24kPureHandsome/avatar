package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"aigcpanel-cli/internal"

	"github.com/spf13/cobra"
)

var taskCmd = &cobra.Command{
	Use:   "task",
	Short: "Submit a task and wait for result",
	Long: `Submit a task to AigcPanel and poll until completion.

Usage:
  aigcpanel task --biz <biz> [--key value ...]
  aigcpanel task --biz <biz> --task-id <id> --stage <stage> [--key value ...]

Flags:
  --biz      Required. Task type (e.g. VideoCompress, SoundGenerate)
  --task-id  Task ID of a paused task to continue (used with --stage)
  --stage    Stage name to continue (e.g. Config, Confirm)

For long parameter values, use --key-json /path/to/file.json to read from a JSON file.

Examples:
  aigcpanel task --biz VideoCompress --file /path/to/video.mp4
  aigcpanel task --biz SoundGenerate --text "Hello world"
  aigcpanel task --biz VideoZoom --video /path/to/video.mp4
  aigcpanel task --biz VideoZoom --task-id 123 --stage Config --times-json /tmp/times.json`,
	DisableFlagParsing: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		biz, taskId, stage, stageData, modelConfig, helpRequested, err := parseTaskArgs(args)
		if err != nil {
			return err
		}
		if helpRequested {
			return cmd.Help()
		}
		if biz == "" {
			return fmt.Errorf("--biz is required")
		}

		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}

		// Continue a paused task
		if taskId != "" && stage != "" {
			continueResult, err := internal.DoRequest(cfg, "/api/task/continue", map[string]any{
				"taskId": taskId,
				"stage":  stage,
				"data":   stageData,
			})
			if err != nil {
				return err
			}
			cCode, _ := continueResult["code"].(float64)
			if cCode != 0 {
				return internal.PrintJSON(continueResult)
			}
			// Poll for result after continue
			return pollTask(cfg, taskId)
		}

		// Submit new task
		submitResult, err := internal.DoRequest(cfg, "/api/task/submit", map[string]any{
			"biz":         biz,
			"modelConfig": modelConfig,
		})
		if err != nil {
			return err
		}

		code, _ := submitResult["code"].(float64)
		if code != 0 {
			return internal.PrintJSON(submitResult)
		}

		dataMap, _ := submitResult["data"].(map[string]any)
		newTaskId, _ := dataMap["taskId"].(string)
		if newTaskId == "" {
			return fmt.Errorf("no taskId returned from task submit")
		}

		return pollTask(cfg, newTaskId)
	},
}

// pollTask polls /api/model/query until the task reaches a terminal state.
func pollTask(cfg *internal.AuthConfig, taskId string) error {
	deadline := time.Now().Add(120 * time.Second)
	for time.Now().Before(deadline) {
		queryResult, err := internal.DoRequest(cfg, "/api/model/query", map[string]any{
			"taskId": taskId,
		})
		if err != nil {
			return err
		}
		qCode, _ := queryResult["code"].(float64)
		if qCode != 0 {
			return internal.PrintJSON(queryResult)
		}
		qData, _ := queryResult["data"].(map[string]any)
		status, _ := qData["status"].(string)
		switch status {
		case "success", "pause":
			return internal.PrintJSON(queryResult)
		case "error", "fail":
			return internal.PrintJSON(queryResult)
		default:
			time.Sleep(500 * time.Millisecond)
			continue
		}
	}
	return internal.PrintJSON(map[string]any{
		"code": -1,
		"msg":  "timeout waiting for task result",
	})
}

// parseTaskArgs manually parses --key value style arguments.
// Reserved flags: --biz, --task-id, --stage.
// Flags ending in -json are treated as JSON file paths.
// All other --key value pairs become either modelConfig or stageData entries
// depending on whether --stage is provided.
func parseTaskArgs(args []string) (biz, taskId, stage string, stageData map[string]any, modelConfig map[string]any, helpRequested bool, err error) {
	modelConfig = map[string]any{}
	stageData = map[string]any{}

	// First pass: extract reserved flags
	type kv struct{ key, value string }
	var pairs []kv
	i := 0
	for i < len(args) {
		arg := args[i]
		if arg == "--help" || arg == "-h" {
			return "", "", "", nil, nil, true, nil
		}
		if !strings.HasPrefix(arg, "--") {
			i++
			continue
		}
		key := strings.TrimPrefix(arg, "--")
		if i+1 >= len(args) || strings.HasPrefix(args[i+1], "--") {
			fmt.Fprintf(os.Stderr, "warning: flag --%s has no value, ignoring\n", key)
			i++
			continue
		}
		value := args[i+1]
		i += 2
		switch key {
		case "biz":
			biz = value
		case "task-id":
			taskId = value
		case "stage":
			stage = value
		default:
			pairs = append(pairs, kv{key, value})
		}
	}

	// Second pass: distribute remaining flags to modelConfig or stageData
	for _, p := range pairs {
		key, value := p.key, p.value

		// JSON file flag: --key-json /path/to/file.json
		if strings.HasSuffix(key, "-json") {
			realKey := strings.TrimSuffix(key, "-json")
			fileBytes, readErr := os.ReadFile(value)
			if readErr != nil {
				err = fmt.Errorf("cannot read JSON file for --%s: %w", key, readErr)
				return
			}
			var parsed any
			if jsonErr := json.Unmarshal(fileBytes, &parsed); jsonErr != nil {
				err = fmt.Errorf("invalid JSON in file for --%s: %w", key, jsonErr)
				return
			}
			if stage != "" {
				stageData[realKey] = parsed
			} else {
				modelConfig[realKey] = parsed
			}
			continue
		}

		// Regular flag: auto-parse JSON arrays/objects
		trimmed := strings.TrimSpace(value)
		var parsedValue any
		if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
			(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) {
			var parsed any
			if jsonErr := json.Unmarshal([]byte(trimmed), &parsed); jsonErr == nil {
				parsedValue = parsed
			} else {
				parsedValue = value
			}
		} else {
			parsedValue = value
		}

		if stage != "" {
			stageData[key] = parsedValue
		} else {
			modelConfig[key] = parsedValue
		}
	}
	return biz, taskId, stage, stageData, modelConfig, false, nil
}
