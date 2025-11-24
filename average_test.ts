import { expect } from "@std/expect";
import { Average } from "./average.ts";
import { NumberProvider } from "./number_provider.ts";
import { FileAccess } from "./file_access.ts";

class FakeFileSystemNumberProvider implements NumberProvider {
  private fileSystem: Map<string, Array<number>> = new Map();
  private currentPath: string = "";
  
  constructor() {
    this.addFile("/path/to/an/empty/file", []);
    this.addFile("/path/to/some/other/file", [1, 2, 3, 4, 5]);
    this.addFile("C:\\test-data\\third-file.txt", [7, 34, 2]);
  }
  
  addFile(path: string, numbers: Array<number>): void {
    this.fileSystem.set(path, [...numbers]);
  }
  
  setCurrentPath(path: string): void {
    this.currentPath = path;
  }
  
  readNumbers(): Promise<Array<number>> {
    if (!this.fileSystem.has(this.currentPath)) {
      return Promise.reject(new Error(`File not found: ${this.currentPath}`));
    }
    const numbers = this.fileSystem.get(this.currentPath) || [];
    return Promise.resolve([...numbers]);
  }
  
  getAvailablePaths(): Array<string> {
    return Array.from(this.fileSystem.keys());
  }
  
  hasFile(path: string): boolean {
    return this.fileSystem.has(path);
  }
}

class SimpleFakeNumberProvider implements NumberProvider {
  constructor(private numbers: Array<number>) {}
  
  readNumbers(): Promise<Array<number>> {
    return Promise.resolve([...this.numbers]);
  }
}

class HardCodedStubNumberProvider implements NumberProvider {
  readNumbers(): Promise<Array<number>> {
    return Promise.resolve([10, 15, 20, 25, 30]);
  }
}

class ConfigurableStubNumberProvider implements NumberProvider {
  constructor(private stubbedNumbers: Array<number>) {}
  
  readNumbers(): Promise<Array<number>> {
    return Promise.resolve(this.stubbedNumbers);
  }
}

class SimpleMockNumberProvider implements NumberProvider {
  private callCount = 0;
  
  readNumbers(): Promise<Array<number>> {
    this.callCount++;
    return Promise.resolve([5, 10, 15, 20, 25]);
  }
  
  getCallCount(): number {
    return this.callCount;
  }
  
  wasCalledExactly(expectedCalls: number): boolean {
    return this.callCount === expectedCalls;
  }
  
  wasCalled(): boolean {
    return this.callCount > 0;
  }
}


class MockNumberProvider implements NumberProvider {
  private callCount = 0;
  private expectedCalls = 0;
  
  constructor(private numbers: Array<number>, expectedCalls: number = 1) {
    this.expectedCalls = expectedCalls;
  }
  
  readNumbers(): Promise<Array<number>> {
    this.callCount++;
    return Promise.resolve([...this.numbers]);
  }
  
  verify(): void {
    if (this.callCount !== this.expectedCalls) {
      throw new Error(`Expected ${this.expectedCalls} calls, but got ${this.callCount}`);
    }
  }
  
  getCallCount(): number {
    return this.callCount;
  }
}

class SpyNumberProvider implements NumberProvider {
  private calls: Array<{ timestamp: Date }> = [];
  
  constructor(private numbers: Array<number>) {}
  
  readNumbers(): Promise<Array<number>> {
    this.calls.push({ timestamp: new Date() });
    return Promise.resolve([...this.numbers]);
  }
  
  getCalls(): Array<{ timestamp: Date }> {
    return [...this.calls];
  }
  
  getCallCount(): number {
    return this.calls.length;
  }
  
  wasCalledWith(): boolean {
    return this.calls.length > 0;
  }
}


class FileAccessSpy implements NumberProvider {
  private callCount = 0;
  private recordedResults: Array<Array<number>> = [];
  
  constructor(private realFileAccess: NumberProvider) {}
  
  async readNumbers(): Promise<Array<number>> {
    // Call the real implementation
    const result = await this.realFileAccess.readNumbers();
    
    // Record the interaction
    this.callCount++;
    this.recordedResults.push([...result]); 
    
    return result;
  }
  
  getCallCount(): number {
    return this.callCount;
  }
  
  getRecordedResults(): Array<Array<number>> {
    return this.recordedResults.map(result => [...result]); 
  }
  
  getLastResult(): Array<number> | undefined {
    return this.recordedResults.length > 0 
      ? [...this.recordedResults[this.recordedResults.length - 1]]
      : undefined;
  }
  
  wasCalledExactly(expectedCalls: number): boolean {
    return this.callCount === expectedCalls;
  }
  
  wasCalled(): boolean {
    return this.callCount > 0;
  }
}

Deno.test("Average.computeMeanOfFile with Simple Fake", async () => {
  const fakeProvider = new SimpleFakeNumberProvider([1, 2, 3, 4, 5]);
  const average = new Average(fakeProvider);
  
  const result = await average.computeMeanOfFile();
  
  expect(result).toBe(3); 
});

Deno.test("Average.computeMedianOfFile with Simple Fake", async () => {
  const fakeProvider = new SimpleFakeNumberProvider([1, 3, 2, 5, 4]);
  const average = new Average(fakeProvider);
  
  const result = await average.computeMedianOfFile();
  
  expect(result).toBe(3); 
});

Deno.test("Average.computeMeanOfFile with Fake File System - existing file", async () => {
  const fakeFileSystem = new FakeFileSystemNumberProvider();
  fakeFileSystem.setCurrentPath("/path/to/some/other/file");
  const average = new Average(fakeFileSystem);
  
  const result = await average.computeMeanOfFile();
  
  expect(result).toBe(3); 
});

Deno.test("Average.computeModeOfFile with Fake File System - custom test data", async () => {
  const fakeFileSystem = new FakeFileSystemNumberProvider();
  
  fakeFileSystem.addFile("/test/mode-data.txt", [1, 1, 2, 2, 2, 3]);
  fakeFileSystem.setCurrentPath("/test/mode-data.txt");
  
  const average = new Average(fakeFileSystem);
  
  const result = await average.computeModeOfFile();
  
  expect(result).toEqual([2]);
});

Deno.test("Average.computeMedianOfFile with Fake File System - empty file", async () => {
  const fakeFileSystem = new FakeFileSystemNumberProvider();
  fakeFileSystem.setCurrentPath("/path/to/an/empty/file");
  const average = new Average(fakeFileSystem);
  
  const result = await average.computeMedianOfFile();
  
  expect(Number.isNaN(result)).toBe(true);
});

Deno.test("Fake File System - file not found error", async () => {
  const fakeFileSystem = new FakeFileSystemNumberProvider();
  fakeFileSystem.setCurrentPath("/non/existent/file.txt");
  const average = new Average(fakeFileSystem);
  
  try {
    await average.computeMeanOfFile();
    expect(true).toBe(false); 
  } catch (error) {
    expect((error as Error).message).toBe("File not found: /non/existent/file.txt");
  }
});

Deno.test("Fake File System - multiple file operations", async () => {
  const fakeFileSystem = new FakeFileSystemNumberProvider();
  
  fakeFileSystem.addFile("/data/set1.txt", [10, 20, 30]);
  fakeFileSystem.addFile("/data/set2.txt", [5, 15, 25, 35]);
  
  const average = new Average(fakeFileSystem);
  
  fakeFileSystem.setCurrentPath("/data/set1.txt");
  const mean1 = await average.computeMeanOfFile();
  expect(mean1).toBe(20); 
  
  fakeFileSystem.setCurrentPath("/data/set2.txt");
  const mean2 = await average.computeMeanOfFile();
  expect(mean2).toBe(20); 
  
  expect(fakeFileSystem.hasFile("/data/set1.txt")).toBe(true);
  expect(fakeFileSystem.hasFile("/data/set2.txt")).toBe(true);
  expect(fakeFileSystem.hasFile("/nonexistent.txt")).toBe(false);
});

Deno.test("Average.computeMeanOfFile with Hard-coded Stub", async () => {
  const stubProvider = new HardCodedStubNumberProvider();
  const average = new Average(stubProvider);
  
  const result = await average.computeMeanOfFile();
  
  expect(result).toBe(20);
});

Deno.test("Average.computeMeanOfFile with Configurable Stub", async () => {
  const stubProvider = new ConfigurableStubNumberProvider([10, 15, 20, 25, 30]);
  const average = new Average(stubProvider);
  
  const result = await average.computeMeanOfFile();
  
  expect(result).toBe(20);
});

Deno.test("Average.computeMeanOfFile with Configurable Stub - empty array", async () => {
  const stubProvider = new ConfigurableStubNumberProvider([]);
  const average = new Average(stubProvider);
  
  const result = await average.computeMeanOfFile();
  
  expect(Number.isNaN(result)).toBe(true); 
});

Deno.test("Average.computeModeOfFile with Configurable Stub", async () => {
  const stubProvider = new ConfigurableStubNumberProvider([1, 1, 2, 2, 3]);
  const average = new Average(stubProvider);
  
  const result = await average.computeModeOfFile();
  
  expect(result).toEqual([1, 2]);
});

Deno.test("Average.computeMeanOfFile with Mock - verifies single call", async () => {
  const mockProvider = new MockNumberProvider([10, 20, 30], 1);
  const average = new Average(mockProvider);
  
  const result = await average.computeMeanOfFile();
  
  expect(result).toBe(20); 
  mockProvider.verify(); 
});

Deno.test("Average.computeMedianOfFile with Mock - verifies call behavior", async () => {
  const mockProvider = new MockNumberProvider([5, 1, 9, 3, 7], 1);
  const average = new Average(mockProvider);
  
  await average.computeMedianOfFile();
  
  expect(mockProvider.getCallCount()).toBe(1);
  mockProvider.verify();
});

Deno.test("Average.computeModeOfFile with Spy - records interactions", async () => {
  const spyProvider = new SpyNumberProvider([2, 2, 3, 3, 3, 1]);
  const average = new Average(spyProvider);
  
  const result = await average.computeModeOfFile();
  
  expect(result).toEqual([3]); 
  expect(spyProvider.wasCalledWith()).toBe(true);
  expect(spyProvider.getCallCount()).toBe(1);
  expect(spyProvider.getCalls().length).toBe(1);
});

Deno.test("Spy can track multiple calls", async () => {
  const spyProvider = new SpyNumberProvider([1, 2, 3]);
  const average = new Average(spyProvider);
  
  await average.computeMeanOfFile();
  await average.computeMedianOfFile();
  await average.computeModeOfFile();
  
  expect(spyProvider.getCallCount()).toBe(3);
  expect(spyProvider.getCalls().length).toBe(3);
  const calls = spyProvider.getCalls();
  expect(calls[0].timestamp <= calls[1].timestamp).toBe(true);
  expect(calls[1].timestamp <= calls[2].timestamp).toBe(true);
});

Deno.test("Readability Comparison - Complex calculation with Hard-coded Stub", async () => {
  const stubProvider = new HardCodedStubNumberProvider();
  const average = new Average(stubProvider);
  
  const result = await average.computeMedianOfFile();
  
  expect(result).toBe(20); 
});

Deno.test("Readability Comparison - Complex calculation with Configurable Stub", async () => {
  const testData = [10, 15, 20, 25, 30];
  const stubProvider = new ConfigurableStubNumberProvider(testData);
  const average = new Average(stubProvider);
  
  const result = await average.computeMedianOfFile();
  
  expect(result).toBe(20);
});

Deno.test("Average.computeMeanOfFile with Simple Mock - verify call count", async () => {
  // Arrange
  const mockProvider = new SimpleMockNumberProvider();
  const average = new Average(mockProvider);
  
  expect(mockProvider.getCallCount()).toBe(0);
  expect(mockProvider.wasCalled()).toBe(false);
  
  // Act
  const result = await average.computeMeanOfFile();
  
  // Assert
  expect(result).toBe(15); 
  expect(mockProvider.getCallCount()).toBe(1);
  expect(mockProvider.wasCalled()).toBe(true);
  expect(mockProvider.wasCalledExactly(1)).toBe(true);
});

Deno.test("Simple Mock - multiple calls increment counter correctly", async () => {
  // Arrange
  const mockProvider = new SimpleMockNumberProvider();
  const average = new Average(mockProvider);
  
  expect(mockProvider.getCallCount()).toBe(0);
  
  // Act
  await average.computeMeanOfFile();   
  expect(mockProvider.getCallCount()).toBe(1);
  
  await average.computeMedianOfFile(); 
  expect(mockProvider.getCallCount()).toBe(2);
  
  await average.computeModeOfFile();   
  expect(mockProvider.getCallCount()).toBe(3);
  
  // Assert 
  expect(mockProvider.wasCalled()).toBe(true);
  expect(mockProvider.wasCalledExactly(3)).toBe(true);
  expect(mockProvider.wasCalledExactly(2)).toBe(false); 
});

Deno.test("Simple Mock - verify consistent return values across calls", async () => {
  // Arrange
  const mockProvider = new SimpleMockNumberProvider();
  const average = new Average(mockProvider);
  
  // Act & Assert 
  const mean1 = await average.computeMeanOfFile();
  const mean2 = await average.computeMeanOfFile();
  const mean3 = await average.computeMeanOfFile();
  
  expect(mean1).toBe(15);
  expect(mean2).toBe(15);
  expect(mean3).toBe(15);
  
  expect(mockProvider.getCallCount()).toBe(3);
});

Deno.test("Simple Mock - test different statistical operations", async () => {
  // Arrange
  const mockProvider = new SimpleMockNumberProvider();
  const average = new Average(mockProvider);
  
  // Act & Assert 
  const mean = await average.computeMeanOfFile();
  expect(mean).toBe(15); 
  
  const median = await average.computeMedianOfFile();
  expect(median).toBe(15); 
  
  const mode = await average.computeModeOfFile();
  expect(mode).toEqual([5, 10, 15, 20, 25]); 
  expect(mockProvider.getCallCount()).toBe(3);
  expect(mockProvider.wasCalledExactly(3)).toBe(true);
});

Deno.test("FileAccess Spy - verify single call and recorded values", async () => {
  // Arrange: Create temporary test file
  const tempFilePath = "./temp_test_file.txt";
  const testData = "1\n2\n3\n4\n5";
  const expectedNumbers = [1, 2, 3, 4, 5];
  
  try {
    // Create temporary file with test data
    await Deno.writeTextFile(tempFilePath, testData);
    
    // Create real FileAccess and wrap it with spy
    const realFileAccess = new FileAccess(tempFilePath);
    const spy = new FileAccessSpy(realFileAccess);
    const average = new Average(spy);
    
    // Verify initial state
    expect(spy.getCallCount()).toBe(0);
    expect(spy.wasCalled()).toBe(false);
    expect(spy.getRecordedResults()).toEqual([]);
    
    // Act
    const result = await average.computeMeanOfFile();
    
    // Assert - verify both result and spy behavior
    expect(result).toBe(3); // Mean of [1,2,3,4,5] = 15/5 = 3
    
    // Verify spy recorded exactly one call
    expect(spy.wasCalledExactly(1)).toBe(true);
    expect(spy.wasCalled()).toBe(true);
    expect(spy.getCallCount()).toBe(1);
    
    // Verify spy recorded the correct return values
    const recordedResults = spy.getRecordedResults();
    expect(recordedResults.length).toBe(1);
    expect(recordedResults[0]).toEqual(expectedNumbers);
    
    // Verify last result matches
    expect(spy.getLastResult()).toEqual(expectedNumbers);
    
  } finally {
    // Cleanup: Remove temporary file
    try {
      await Deno.remove(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("FileAccess Spy - multiple calls record all interactions", async () => {
  // Arrange: Create temporary test file with different data
  const tempFilePath = "./temp_multi_test_file.txt";
  const testData = "10\n20\n30";
  const expectedNumbers = [10, 20, 30];
  
  try {
    await Deno.writeTextFile(tempFilePath, testData);
    
    const realFileAccess = new FileAccess(tempFilePath);
    const spy = new FileAccessSpy(realFileAccess);
    const average = new Average(spy);
    
    // Act - make multiple calls to different methods
    const mean = await average.computeMeanOfFile();     // Call 1
    const median = await average.computeMedianOfFile(); // Call 2  
    const mode = await average.computeModeOfFile();     // Call 3
    
    // Assert results are correct
    expect(mean).toBe(20);   // (10+20+30)/3 = 20
    expect(median).toBe(20); // Middle of [10,20,30] = 20
    expect(mode).toEqual([10, 20, 30]); // All appear once
    
    // Verify spy recorded all 3 calls
    expect(spy.getCallCount()).toBe(3);
    expect(spy.wasCalledExactly(3)).toBe(true);
    
    // Verify all results were recorded correctly
    const recordedResults = spy.getRecordedResults();
    expect(recordedResults.length).toBe(3);
    expect(recordedResults[0]).toEqual(expectedNumbers); // First call
    expect(recordedResults[1]).toEqual(expectedNumbers); // Second call
    expect(recordedResults[2]).toEqual(expectedNumbers); // Third call
    
    // Verify last result is still correct
    expect(spy.getLastResult()).toEqual(expectedNumbers);
    
  } finally {
    try {
      await Deno.remove(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test("FileAccess Spy - handles file with mixed content", async () => {
  // Arrange: Create file with mixed content (numbers and non-numbers)
  const tempFilePath = "./temp_mixed_content_file.txt";
  const testData = "7\nabc\n34\n\n2\nxyz\n"; // Should parse as [7, 34, 2]
  const expectedNumbers = [7, 34, 2];
  
  try {
    await Deno.writeTextFile(tempFilePath, testData);
    
    const realFileAccess = new FileAccess(tempFilePath);
    const spy = new FileAccessSpy(realFileAccess);
    const average = new Average(spy);
    
    // Act
    const result = await average.computeMedianOfFile();
    
    // Assert - verify median calculation with filtered numbers
    expect(result).toBe(7); // Median of [7, 34, 2] -> sorted [2, 7, 34] -> middle = 7
    
    // Verify spy behavior
    expect(spy.wasCalledExactly(1)).toBe(true);
    expect(spy.getRecordedResults()[0]).toEqual(expectedNumbers);
    expect(spy.getLastResult()).toEqual(expectedNumbers);
    
  } finally {
    try {
      await Deno.remove(tempFilePath);
    } catch {
    }
  }
});

Deno.test("FileAccess Spy - verify independence of recorded results", async () => {
  // Arrange: Test that recorded results are independent copies
  const tempFilePath = "./temp_independence_test_file.txt";
  const testData = "100\n200";
  
  try {
    await Deno.writeTextFile(tempFilePath, testData);
    
    const realFileAccess = new FileAccess(tempFilePath);
    const spy = new FileAccessSpy(realFileAccess);
    const average = new Average(spy);
    
    // Act
    await average.computeMeanOfFile();
    
    // Get recorded results
    const recordedResults = spy.getRecordedResults();
    const lastResult = spy.getLastResult();
    
    // Modify the returned arrays (should not affect spy's internal state)
    recordedResults[0].push(999);
    lastResult?.push(888);
    
    // Assert - verify spy's internal data is unchanged
    const freshRecordedResults = spy.getRecordedResults();
    const freshLastResult = spy.getLastResult();
    
    expect(freshRecordedResults[0]).toEqual([100, 200]); // Should not include 999
    expect(freshLastResult).toEqual([100, 200]);         // Should not include 888
    
  } finally {
    try {
      await Deno.remove(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
});


