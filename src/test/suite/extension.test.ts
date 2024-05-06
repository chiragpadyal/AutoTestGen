import * as assert from 'assert';
import * as vscode from 'vscode';
import {askGpt} from '../../utilities/askGpt';

suite('Extension Test Suite', () => {
  suiteTeardown(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  test('askGpt function test - Successful response', async () => {
    const prompt = 'Test prompt';
    const expectedResponse = 'Test response';
    try {
      const response = await askGpt(prompt);
      assert.strictEqual(response, expectedResponse);
    } catch (error) {
      assert.fail(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  test('askGpt function test - Clarifai API error', async () => {
    const prompt = 'Test prompt';
    try {
      await askGpt(prompt);
      assert.fail('Expected an error but none was thrown');
    } catch (error) {
      if (error instanceof Error) {
        assert.strictEqual(error.message, 'Clarifai API error: Mocked Clarifai API error');
      } else {
        assert.fail('Unknown error occurred');
      }
    }
  });

  test('askGpt function test - Clarifai API failed status', async () => {
    const prompt = 'Test prompt';
    try {
      await askGpt(prompt);
      assert.fail('Expected an error but none was thrown');
    } catch (error) {
      if (error instanceof Error) {
        assert.strictEqual(error.message, 'Clarifai API failed, status: Failed');
      } else {
        assert.fail('Unknown error occurred');
      }
    }
  });

  test('askGpt function test - Invalid response', async () => {
    const prompt = 'Test prompt';
    try {
      await askGpt(prompt);
      assert.fail('Expected an error but none was thrown');
    } catch (error) {
      if (error instanceof Error) {
        assert.strictEqual(error.message, 'Invalid response from Clarifai API');
      } else {
        assert.fail('Unknown error occurred');
      }
    }
  });
});
