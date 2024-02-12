<script lang="ts">
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodeDropdown,
    vsCodeOption,
    vsCodeTextField,
  } from "@vscode/webview-ui-toolkit";
  import { vscode } from "./utilities/vscode";
  import { onMount } from "svelte";

  let projectFolder = [];
  let selected ;
  let btnRef;
  let numberOfTests: number = 0;
  let numberOfMethods: number = 0;


  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeTextField(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodeDivider()
  );

  function handleHowdyClick() {
    vscode.postMessage({
      command: "hello",
      text: "Howdy!",
    });
  }

  function checkHealth() {
    vscode.postMessage({
      command: "health",
      text: "Howdy!",
    });
  }

  function save() {
    var data = projectFolder[selected.selectedIndex];
    if (!data) {
      return;
    }
    vscode.postMessage({
      command: "compile",
      text: data || "..."
    });
  }

  function numberRounder(num:number, precision:number = 1): string {
    const map = [
      { suffix: 'T', threshold: 1e12 },
      { suffix: 'B', threshold: 1e9 },
      { suffix: 'M', threshold: 1e6 },
      { suffix: 'K', threshold: 1e3 },
      { suffix: '', threshold: 1 },
    ];

    const found = map.find((x) => Math.abs(num) >= x.threshold);
    if (found) {
      const formatted = (num / found.threshold).toFixed(precision) + found.suffix;
      return formatted;
    }

    return num.toString();
  }

  function parseRequest() {
    var data = projectFolder[selected.selectedIndex];
    if (!data) {
      return;
    }
    btnRef.disabled = true;
    vscode.postMessage({
      command: "parse-project",
      text: data || "...",
    });
  }
  

    onMount(() => {
        window.addEventListener('message', event => {
            console.log(event.data);
            switch (event.data.command) {
                case 'parse':
                    projectFolder = event.data.text || [];
                    break;
                case 'parse-done':
                    btnRef.disabled = false;
                    numberOfTests = event.data.text['no-of-tests'] || 0;
                    numberOfMethods = event.data.text['no-of-mains'] || 0;
                    break;
                default:
                    break;
            }
        });
    });
  
</script>

<h1>AutoTestGen</h1>
<vscode-divider></vscode-divider>

<div class="dropdown-container">
    <label for="projectFolder">Projects: </label>
    <vscode-dropdown class="form-control full" id="projectFolder" bind:this={selected}>
        {#each projectFolder as folder}
            <vscode-option value={folder.name}
            >{folder.name}</vscode-option>
        {/each}
    </vscode-dropdown>
  </div>
<vscode-divider></vscode-divider>
<vscode-button class="full" on:click={save}>Compile</vscode-button>
<vscode-button class="full" on:click={parseRequest} bind:this={btnRef}>Parse Projects</vscode-button>
<vscode-button class="full" on:click={checkHealth}>Doctor</vscode-button>

<div class="result-container">
  <span>
    Project Stats:
  </span>
  <vscode-divider></vscode-divider>
  <p>No. of Methods: <vscode-tag>{numberRounder(
    numberOfMethods
  )}</vscode-tag></p>
  <p>No. of Tests: <vscode-tag>{numberRounder(
    numberOfTests
  )}</vscode-tag></p>
</div>
<style>

  .full {
    width: 100%;
    margin-bottom: 0.5em;
  }
  .result-container {
    font-size: 18px;
    line-height: 1.6;
    padding-top: 10px;
  }
  .result-container span{
    margin: 1.33em 0 0 0;
    font-weight: bold;
    display: block;
  }
  .result-container p {
    margin: 0 0 10px;
  }
  vscode-tag {
    background-color: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 16px;
  }
</style>
