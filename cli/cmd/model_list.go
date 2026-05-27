package cmd

import (
	"aigcpanel-cli/internal"

	"github.com/spf13/cobra"
)

var modelListCmd = &cobra.Command{
	Use:   "model_list",
	Short: "List installed AI models",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := internal.LoadAuthConfig()
		if err != nil {
			return err
		}
		result, err := internal.DoRequest(cfg, "/api/model/list", map[string]any{})
		if err != nil {
			return err
		}
		// 只保留 name/title/version/functions，去掉 id
		if data, ok := result["data"].([]any); ok {
			for _, item := range data {
				if model, ok := item.(map[string]any); ok {
					delete(model, "id")
				}
			}
		}
		return internal.PrintJSON(result)
	},
}
