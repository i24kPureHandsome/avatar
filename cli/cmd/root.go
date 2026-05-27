package cmd

import (
	"os"

	"github.com/spf13/cobra"
)

var appVersion string

// Execute sets the version and runs the root command.
func Execute(version string) {
	appVersion = version
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "aigcpanel",
	Short: "AIGCPanel CLI",
	Long:  "AIGCPanel command-line tool for interacting with the local AigcPanel service.",
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(modelListCmd)
	rootCmd.AddCommand(taskCmd)
}
