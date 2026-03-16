package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"reflect"
	"strings"
)

type Package struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Author      string `json:"author"`
	Version     string `json:"version"`
	Repository  struct { URL string `json:"url"` } `json:"repository"`
	License  string    `json:"license"`
	Manifest *Defaults `json:"manifest,omitempty"`
}

type Defaults struct {
	FxVersion    string   `json:"fx_version,omitempty"`
	Game         string   `json:"game,omitempty"`
	NodeVersion  string   `json:"node_version,omitempty"`
	Client       []string `json:"client_scripts,omitempty"`
	Server       []string `json:"server_scripts,omitempty"`
	Files        []string `json:"files,omitempty"`
	Dependencies []string `json:"dependencies,omitempty"`
}

type Config struct {
	Package  string
	Output   string
	DryRun   bool
	Defaults Defaults
}

func Init() *Config {
	return &Config{
		Package: "package.json",
		Output:  "fxmanifest.lua",
		Defaults: Defaults{
			FxVersion:    "cerulean",
			Game:         "gta5",
			NodeVersion:  "22",
			Client:       []string{"dist/client/*.js"},
			Server:       []string{"dist/server/*.js"},
			Files:        []string{"locales/*.json"},
			Dependencies: []string{"/server:12913", "/onesync", "ox_lib", "ox_core", "ox_inventory"},
		},
	}
}

type ManifestGenerator struct {
	config *Config
}

func New(config *Config) *ManifestGenerator {
	return &ManifestGenerator{config: config}
}

func (mg *ManifestGenerator) load() (*Package, error) {
	if _, err := os.Stat(mg.config.Package); os.IsNotExist(err) {
		return nil, fmt.Errorf("package file not found %q: %w", mg.config.Package, err)
	}
	data, err := os.ReadFile(mg.config.Package)
	if err != nil {
		return nil, fmt.Errorf("reading package file %q: %w", mg.config.Package, err)
	}
	var pkg Package
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, fmt.Errorf("parsing package file %q: %w", mg.config.Package, err)
	}
	return &pkg, nil
}

func sanitize(s string) string {
	replacements := []struct{ old, val string }{
		{"'", "\\'"},
		{"\n", "\\n"},
		{"\r", "\\r"},
	}
	for _, r := range replacements {
		s = strings.ReplaceAll(s, r.old, r.val)
	}
	return s
}

func addTable(lines *[]string, title string, items []string) {
	if len(items) == 0 {
		return
	}
	*lines = append(*lines, fmt.Sprintf("\n%s {", title))
	for i, item := range items {
		comma := ","
		if i == len(items)-1 {
			comma = ""
		}
		*lines = append(*lines, fmt.Sprintf("\t'%s'%s", sanitize(item), comma))
	}
	*lines = append(*lines, "}")
}

func merge(base Defaults, override *Defaults) Defaults {
	if override == nil {
		return base
	}
	result := base
	dst := reflect.ValueOf(&result).Elem()
	src := reflect.ValueOf(override).Elem()
	for i := 0; i < src.NumField(); i++ {
		if field := src.Field(i); !field.IsZero() {
			dst.Field(i).Set(field)
		}
	}
	return result
}

func addField(lines *[]string, field, value string) {
	if value != "" {
		*lines = append(*lines, fmt.Sprintf("%s '%s'", field, sanitize(value)))
	}
}

func (mg *ManifestGenerator) write(pkg *Package) string {
	var lines []string
	cfg := merge(mg.config.Defaults, pkg.Manifest)
	lines = append(lines, fmt.Sprintf("fx_version '%s'", cfg.FxVersion), fmt.Sprintf("game '%s'", cfg.Game))
	for _, f := range []struct{ field, value string }{
		{"name", pkg.Name},
		{"description", pkg.Description},
		{"author", pkg.Author},
		{"version", pkg.Version},
		{"repository", pkg.Repository.URL},
		{"license", pkg.License},
		{"node_version", cfg.NodeVersion},
	} {
		addField(&lines, f.field, f.value)
	}
	for _, section := range []struct {
		title string
		items []string
	}{
		{"client_scripts", cfg.Client},
		{"server_scripts", cfg.Server},
		{"files", cfg.Files},
		{"dependencies", cfg.Dependencies},
	} {
		addTable(&lines, section.title, section.items)
	}
	return strings.Join(lines, "\n")
}

func (mg *ManifestGenerator) Generate() error {
	pkg, err := mg.load()
	if err != nil {
		return fmt.Errorf("loading package: %w", err)
	}
	manifest := mg.write(pkg)
	if mg.config.DryRun {
		fmt.Println(manifest)
		return nil
	}
	if err := os.WriteFile(mg.config.Output, []byte(manifest), 0644); err != nil {
		return fmt.Errorf("writing manifest %q: %w", mg.config.Output, err)
	}
	return nil
}

func main() {
	config := Init()
	flag.BoolVar(&config.DryRun, "dry-run", false, "dry-run")
	flag.Parse()
	generator := New(config)
	if err := generator.Generate(); err != nil {
		log.Fatalf("generator.Generate(): %v", err)
	}
	if !config.DryRun {
		fmt.Printf("Successfully generated %s\n", config.Output)
	}
}
