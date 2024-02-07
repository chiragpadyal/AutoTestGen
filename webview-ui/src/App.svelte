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

  let sysText = "Write java test case for following code, {{custom prompt}}: {{code}} ";
  let cusText = "";
  let fileLoc = "{projectroot}/src/test/**/{class-name}-test.java";
  let temp = "";
  let projectFolder = [];
  let selected ;
  let btnRef;


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
                    break;
                default:
                    break;
            }
        });
    });
  
</script>

<h1>AutoTestGen</h1>
<vscode-divider></vscode-divider>

<!-- <label for="fileName">File Location: </label>
<input 
    class="form-control"
    type="text"
    id="text"
    bind:value={fileLoc}
    placeholder="Edit prompt here..."
/> -->

<!-- dropdown from  0 to 10 number -->
<div class="dropdown-container">
  <label for="my-dropdown">Temperature: </label>
  <vscode-dropdown class="form-control full" id="exampleFormControlSelect1">
    <vscode-option>0</vscode-option>
    <vscode-option>1</vscode-option>
    <vscode-option>2</vscode-option>
    <vscode-option>3</vscode-option>
    <vscode-option>4</vscode-option>
    <vscode-option>5</vscode-option>
    <vscode-option>6</vscode-option>
    <vscode-option>7</vscode-option>
    <vscode-option>8</vscode-option>
    <vscode-option>9</vscode-option>
    <vscode-option>10</vscode-option>
  </vscode-dropdown>
</div>

<!-- project folder -->
<div class="dropdown-container">
    <label for="projectFolder">Projects: </label>
    <vscode-dropdown class="form-control full" id="projectFolder" bind:this={selected}>
        {#each projectFolder as folder}
            <vscode-option value={folder.name}
            >{folder.name}</vscode-option>
        {/each}
    </vscode-dropdown>
  </div>

<!-- <vscode-divider></vscode-divider> -->

<!-- <vscode-text-field
  class="form-control full"
  rows="3"
  id="text"
  style="resize: vertical;"
  minlength="15"
  value={sysText}
  placeholder="Edit System prompt here...">System Prompt</vscode-text-field
> -->

<!-- <vscode-text-field

  class="form-control full"
  rows="10"
  id="text"
  style="resize: vertical;"
  minlength="15"
  value={cusText}
  placeholder="Edit Custom prompt here..."
  >Custom Prompt:
</vscode-text-field> -->
<vscode-divider></vscode-divider>
<vscode-button class="full" on:click={save}>Compile</vscode-button>
<vscode-button class="full" on:click={parseRequest} bind:this={btnRef}>Parse Projects</vscode-button>
<vscode-button class="full" on:click={checkHealth}>Doctor</vscode-button>
<style>

  .full {
    width: 100%;
    margin-bottom: 0.5em;
  }

  .dropdown-container {
    box-sizing: border-box;
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
  }

  .dropdown-container label {
    display: block;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: var(--vscode-font-size);
    line-height: normal;
    margin-bottom: 2px;
  }
</style>
