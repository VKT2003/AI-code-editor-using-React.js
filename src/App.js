import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/mode-python';
import Sk from 'skulpt';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      code: '',
      output: '',
      suggestion: ''
    };
    this.timeout = null;
  }

  runCode = () => {
    const { code } = this.state;
    Sk.configure({
      output: (text) => this.setState({ output: text }),
      read: this.readBuiltin
    });
    Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, code, true)).catch((err) => {
      this.setState({ output: err.toString() });
    });
  }

  readBuiltin = (x) => {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
      throw new Error("File not found: '" + x + "'");
    }
    return Sk.builtinFiles["files"][x];
  }

  handleCodeChange = (newCode) => {
    this.setState({ code: newCode });
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.fetchAutocomplete(newCode);
    }, 500);
  }

  handleKeyDown = (event) => {
    if (event.key === 'Tab' && this.state.suggestion) {
      event.preventDefault();
      this.setState(prevState => ({
        code: prevState.code + prevState.suggestion,
        suggestion: ''
      }));
    }
  }
 
  fetchAutocomplete = async (userInput) => {
    const data = {
      inputs: userInput,
      parameters: {
        max_length: userInput.length + 50,
        temperature: 0.7,
        top_p: 0.9,
        num_return_sequences: 1,
      }
    };
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        {
          headers: {
            Authorization: "Bearer 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",
            'Content-Type': 'application/json'
          },
          method: "POST",
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }

      const result = await response.json();
      const generatedText = result[0].generated_text;
      const suggestion = generatedText.slice(userInput.length);
      this.setState({ suggestion });
    } catch (error) {
      console.error('Error generating text:', error);
      this.setState({ suggestion: '' });
    }
  }

  render() {
    const { code, output, suggestion } = this.state;

    return (
      <div className='main'>
        <p>App.py</p>
        <div className='editor-container'>
          <AceEditor
            placeholder="Write code here..."
            mode="python"
            theme="monokai"
            name="editor"
            onChange={this.handleCodeChange}
            onKeyDown={this.handleKeyDown}
            fontSize={17}
            lineHeight={19}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={code}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
            className='editor'
          />
          {suggestion && (
            <div className='suggestion'>
              {code + suggestion}
            </div>
          )}
        </div>
        <button onClick={this.runCode}>Run</button>
        <div className='result'>{output}</div>
      </div>
    );
  }
}

export default App;
