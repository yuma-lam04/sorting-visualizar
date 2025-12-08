import { useState, useEffect, useRef } from 'react';

function App() {
  const [numbers, setNumbers] = useState([]);
  // const [isSorting, setIsSorting] = useState(false); // Replaced by status
  const [compareIndices, setCompareIndices] = useState([]);
  const [swapIndices, setSwapIndices] = useState([]);
  const [sortedIndices, setSortedIndices] = useState([]);
  const [pivotIndices, setPivotIndices] = useState([]);
  const [heapIndices, setHeapIndices] = useState([]);
  const [minIndices, setMinIndices] = useState([]);
  const [digitValues, setDigitValues] = useState([]); // For radix color mapping
  const [gnomeIndex, setGnomeIndex] = useState(null); // For gnome sort visualization
  const [infoMessage, setInfoMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'sorting', 'paused', 'finished'

  // Metrics & Order State
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [metrics, setMetrics] = useState({ comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 });
  const metricsRef = useRef({ comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 });

  // Refs for control
  const isPausedRef = useRef(false);
  const isResettingRef = useRef(false);

  // Settings State
  const [arraySize, setArraySize] = useState(20);
  const [delay, setDelay] = useState(300);
  const [algorithm, setAlgorithm] = useState('bubble');
  const previousSizeRef = useRef(20);

  // Ref for delay to access latest value inside sorting loop
  const delayRef = useRef(delay);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  useEffect(() => {
    generateRandomArray();
  }, [arraySize, algorithm]); // Reset when algorithm changes too

  const generateRandomArray = () => {
    // Determine bounds based on algorithm
    const min = algorithm === 'radix' ? 10 : 10;
    const max = algorithm === 'radix' ? 999 : 100;
    const newNumbers = Array.from({ length: arraySize }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    setNumbers(newNumbers);
    setSortedIndices([]);
    setCompareIndices([]);
    setSwapIndices([]);
    setPivotIndices([]);
    setHeapIndices([]);
    setDigitValues([]);
    setGnomeIndex(null);
    setInfoMessage('');
    // Reset Metrics
    setMetrics({ comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 });
    metricsRef.current = { comparisons: 0, swaps: 0, startTime: 0, elapsed: 0 };
  };

  // Helper: Should Swap? (Handles Asc/Desc and Comparison Counting)
  const shouldSwap = (a, b) => {
    metricsRef.current.comparisons++;
    // Update state occasionally? Doing it here might be too frequent, 
    // but since we await sleep right after usually, we can sync there.
    // For now, let's allow the next render cycle (via sleep) to pick it up or force it?
    // Actually, we usually call sleep() after actions. We can update UI state there.

    if (sortOrder === 'asc') return a > b;
    return a < b;
  };

  // Helper: Wrapper for setNumbers to count swaps if needed, or just manual increment
  // Let's just manually increment metricsRef.current.swaps++ when we swap.

  // Helper to sync metrics state with ref for rendering
  const updateMetricsState = () => {
    // Calc elapsed if running
    let currentElapsed = metricsRef.current.elapsed;
    if (status === 'sorting' && metricsRef.current.startTime > 0) {
      currentElapsed += (performance.now() - metricsRef.current.startTime);
      // Note: This simple add logic is flawed if called multiple times without resetting startTime.
      // Correct logic for "Running" time display:
      // elapsed = stored_elapsed + (now - last_start_time)
      // We'll calculate display value in render or effect, but here we just sync counts.
    }
    setMetrics(prev => ({
      ...prev,
      comparisons: metricsRef.current.comparisons,
      swaps: metricsRef.current.swaps
    }));
  };

  const checkPause = async () => {
    if (isResettingRef.current) return Promise.reject(new Error('Reset'));
    while (isPausedRef.current) {
      // Paused: Stop timer accumulation
      // When we enter pause, we should have added the segment to elapsed.
      // But handling it here is tricky. 
      // Simplification: We will pause the 'startTime' reference.
      await new Promise(resolve => setTimeout(resolve, 50));
      if (isResettingRef.current) return Promise.reject(new Error('Reset'));
    }
    // Resumed: Update startTime to now so the gap isn't counted
    if (status === 'sorting') {
      metricsRef.current.startTime = performance.now();
    }
  };

  const sleep = async (ms) => {
    // Update metrics UI before sleeping (synchronize Ref to State)
    // Calc elapsed for display
    let currentElapsed = metricsRef.current.elapsed;
    if (!isPausedRef.current && metricsRef.current.startTime > 0) {
      currentElapsed += (performance.now() - metricsRef.current.startTime);
    }
    setMetrics({
      comparisons: metricsRef.current.comparisons,
      swaps: metricsRef.current.swaps,
      elapsed: currentElapsed
    });

    await new Promise((resolve) => setTimeout(resolve, ms));
    await checkPause();
  };

  const handleReset = () => {
    if (status === 'sorting' || status === 'paused') {
      isResettingRef.current = true;
      isPausedRef.current = false; // Unpause to let it hit the error
    }
    generateRandomArray();
    setStatus('idle');
  };

  const handleSort = async () => {
    if (status === 'finished') {
      generateRandomArray();
      // Small delay to let state update if needed, though mostly synchronous here
    }

    if (status === 'paused') {
      setStatus('sorting');
      isPausedRef.current = false;
      return;
    }

    if (status === 'sorting') {
      setStatus('paused');
      isPausedRef.current = true;
      return;
    }

    // Start new sort
    setStatus('sorting');
    isPausedRef.current = false;
    // Start new sort
    setStatus('sorting');
    isPausedRef.current = false;
    isResettingRef.current = false;

    // Init Metrics
    metricsRef.current = {
      ...metricsRef.current, // keep existing counts if this was a resume? No, handleSort is "Start". 
      // Wait, handleSort is called on "Start". If we were finished, we generated new array.
      // If we were paused, we returned early above.
      // So this is a FRESH start.
      comparisons: 0,
      swaps: 0,
      startTime: performance.now(),
      elapsed: 0
    };
    setMetrics(metricsRef.current);

    try {
      switch (algorithm) {
        case 'bubble':
          await bubbleSort();
          break;
        case 'selection':
          await selectionSort();
          break;
        case 'insertion':
          await insertionSort();
          break;
        case 'quick':
          await quickSort();
          break;
        case 'merge':
          await mergeSort();
          break;
        case 'heap':
          await heapSort();
          break;
        case 'radix':
          await radixSort();
          break;
        case 'shaker':
          await shakerSort();
          break;
        case 'bogo':
          await bogoSort();
          break;
        case 'gnome':
          await gnomeSort();
          break;
        case 'comb':
          await combSort();
          break;
        default:
          break;
      }
      // If we got here without error, we finished
      setStatus('finished');
      // Final metrics update
      const finalElapsed = metricsRef.current.elapsed + (performance.now() - metricsRef.current.startTime);
      setMetrics({
        comparisons: metricsRef.current.comparisons,
        swaps: metricsRef.current.swaps,
        elapsed: finalElapsed,
        startTime: 0 // Stop timer
      });
      metricsRef.current.elapsed = finalElapsed;
      metricsRef.current.startTime = 0;

    } catch (error) {
      if (error.message === 'Reset') {
        setStatus('idle');
      } else {
        console.error(error);
        setStatus('idle');
      }
    }
  };

  const bubbleSort = async () => {
    const arr = [...numbers];
    const n = arr.length;
    const sorted = [];

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        setCompareIndices([j, j + 1]);
        await sleep(delayRef.current);

        // Refactored to use shouldSwap
        if (shouldSwap(arr[j], arr[j + 1])) {
          setSwapIndices([j, j + 1]);
          await sleep(delayRef.current);

          let temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          setNumbers([...arr]);
          metricsRef.current.swaps++; // Count swap

          setSwapIndices([]);
        }
        setCompareIndices([]);
      }
      sorted.push(n - i - 1);
      setSortedIndices([...sorted]);
    }
    sorted.push(0);
    setSortedIndices(arr.map((_, i) => i));
  };

  const insertionSort = async () => {
    const arr = [...numbers];
    const n = arr.length;
    setSortedIndices([0]);

    for (let i = 1; i < n; i++) {
      let key = arr[i];
      let j = i - 1;

      setCompareIndices([i, j]);
      await sleep(delayRef.current);

      // ASC: j > key; DESC: j < key
      // shouldSwap(left, right) checks if left should move right.
      // Here we want to move `arr[j]` to `j+1` if it is wrongly ordered vs `key`.
      // If ASC: arr[j] > key -> Move arr[j] right. 
      // check: shouldSwap(arr[j], key) -> true if arr[j] > key

      while (j >= 0 && shouldSwap(arr[j], key)) {
        setCompareIndices([j, j + 1]);
        setSwapIndices([j, j + 1]);
        await sleep(delayRef.current);

        arr[j + 1] = arr[j];
        setNumbers([...arr]);
        metricsRef.current.swaps++; // Shift counts as 'write' or 'swap'
        setSwapIndices([]);

        j = j - 1;
        if (j >= 0) {
          setCompareIndices([j, i]);
        }
      }
      arr[j + 1] = key;
      // Note: assignments count? Let's count significant writes as swaps for simplicity or ignore.
      // User asked for "Swaps". Insertion has shifts. Let's count shifts.
      setNumbers([...arr]);

      const newSorted = [];
      for (let k = 0; k <= i; k++) newSorted.push(k);
      setSortedIndices(newSorted);
    }
    setSortedIndices(arr.map((_, idx) => idx));
  };

  const quickSort = async () => {
    const arr = [...numbers];
    await quickSortHelper(arr, 0, arr.length - 1);
    setSortedIndices(arr.map((_, i) => i));
  };

  const quickSortHelper = async (arr, low, high) => {
    if (low <= high) {
      const pi = await partition(arr, low, high);
      setSortedIndices((prev) => [...prev, pi]); // Pivot is sorted position
      await quickSortHelper(arr, low, pi - 1);
      await quickSortHelper(arr, pi + 1, high);
    }
  };

  const partition = async (arr, low, high) => {
    let pivot = arr[high];
    setPivotIndices([high]); // Visualise Pivot
    let i = low - 1;

    for (let j = low; j < high; j++) {
      setCompareIndices([j, high]);
      await sleep(delayRef.current);

      // ASC: arr[j] < pivot ? -> shouldSwap(arr[j], pivot) == false (and distinct)
      // Actually, we want to move smaller elems to left (Asc).
      // condition: arr[j] < pivot (Asc) or arr[j] > pivot (Desc)
      // shouldSwap(pivot, arr[j]) -> true if pivot > arr[j] (Asc) -> arr[j] < pivot
      // So checks if "pivot comes AFTER arr[j]" in sort order.
      if (shouldSwap(pivot, arr[j])) {
        i++;
        setSwapIndices([i, j]);
        await sleep(delayRef.current);

        let temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        setNumbers([...arr]);
        metricsRef.current.swaps++;

        setSwapIndices([]);
      }
      setCompareIndices([]);
    }

    setSwapIndices([i + 1, high]);
    await sleep(delayRef.current);

    let temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    setNumbers([...arr]);
    metricsRef.current.swaps++;

    setSwapIndices([]);
    setPivotIndices([]);
    return i + 1;
  };

  const mergeSort = async () => {
    let arr = [...numbers];
    await mergeSortHelper(arr, 0, arr.length - 1);
    setSortedIndices(arr.map((_, i) => i));
  };

  const mergeSortHelper = async (arr, l, r) => {
    if (l >= r) return;
    const m = l + Math.floor((r - l) / 2);
    await mergeSortHelper(arr, l, m);
    await mergeSortHelper(arr, m + 1, r);
    await merge(arr, l, m, r);
  };

  const merge = async (arr, l, m, r) => {
    const n1 = m - l + 1;
    const n2 = r - m;
    let L = new Array(n1);
    let R = new Array(n2);

    for (let i = 0; i < n1; i++) L[i] = arr[l + i];
    for (let j = 0; j < n2; j++) R[j] = arr[m + 1 + j];

    let i = 0, j = 0, k = l;

    while (i < n1 && j < n2) {
      setCompareIndices([l + i, m + 1 + j]);
      await sleep(delayRef.current);

      // ASC: L[i] <= R[j] -> Take L[i]
      // DESC: L[i] >= R[j] -> Take L[i]
      // shouldSwap(L[i], R[j]) == true if L[i] > R[j] (Asc) -> Take R[j]
      // So if (!shouldSwap(L[i], R[j])) take L[i]
      if (!shouldSwap(L[i], R[j])) {
        arr[k] = L[i];
        setNumbers([...arr]);
        setSwapIndices([k]);
        await sleep(delayRef.current);
        i++;
      } else {
        arr[k] = R[j];
        setNumbers([...arr]);
        setSwapIndices([k]);
        await sleep(delayRef.current);
        j++;
      }
      metricsRef.current.swaps++; // Assignment in merge sort counts as 'movement'
      k++;
      setSwapIndices([]);
      setCompareIndices([]);
    }

    while (i < n1) {
      arr[k] = L[i];
      setNumbers([...arr]);
      setSwapIndices([k]);
      await sleep(delayRef.current);
      metricsRef.current.swaps++;
      i++;
      k++;
      setSwapIndices([]);
    }

    while (j < n2) {
      arr[k] = R[j];
      setNumbers([...arr]);
      setSwapIndices([k]);
      await sleep(delayRef.current);
      metricsRef.current.swaps++;
      j++;
      k++;
      setSwapIndices([]);
    }
  };

  const selectionSort = async () => {
    let arr = [...numbers];
    let n = arr.length;

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      setMinIndices([minIdx]);

      for (let j = i + 1; j < n; j++) {
        setCompareIndices([j, minIdx]);
        await sleep(delayRef.current);

        // ASC: Find min (arr[j] < arr[minIdx])
        // DESC: Find max (arr[j] > arr[minIdx])
        // shouldSwap(a, b) returns true if a > b (ASC)
        // If we use shouldSwap(arr[minIdx], arr[j]):
        // ASC: minIdx > j ? No, that's position. Values: arr[minIdx] > arr[j] -> True -> minIdx is bigger, so j is smaller.
        if (shouldSwap(arr[minIdx], arr[j])) {
          minIdx = j;
          setMinIndices([minIdx]);
          await sleep(delayRef.current);
        }
        setCompareIndices([]);
      }

      if (minIdx !== i) {
        setSwapIndices([i, minIdx]);
        await sleep(delayRef.current);

        let temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
        setNumbers([...arr]);
        metricsRef.current.swaps++; // Count swap
        setSwapIndices([]);
      }

      setSortedIndices(prev => [...prev, i]);
      setMinIndices([]);
    }
    setSortedIndices(arr.map((_, i) => i));
    setMinIndices([]);
  };

  const heapSort = async () => {
    let arr = [...numbers];
    let n = arr.length;

    // Build max heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      await heapify(arr, n, i);
    }

    // Heap sort
    for (let i = n - 1; i > 0; i--) {
      // Move current root to end
      setSwapIndices([0, i]);
      await sleep(delayRef.current);

      let temp = arr[0];
      arr[0] = arr[i];
      arr[i] = temp;
      setNumbers([...arr]);
      metricsRef.current.swaps++; // Swap
      setSwapIndices([]);

      // Mark i as sorted
      setSortedIndices(prev => [...prev, i]);

      // Call max heapify on the reduced heap
      await heapify(arr, i, 0);
    }
    setSortedIndices(arr.map((_, i) => i));
  };

  const heapify = async (arr, n, i) => {
    let largest = i;
    let l = 2 * i + 1;
    let r = 2 * i + 2;

    // Highlight parent and children
    let indicesToHighlight = [i];
    if (l < n) indicesToHighlight.push(l);
    if (r < n) indicesToHighlight.push(r);

    setHeapIndices(indicesToHighlight);
    await sleep(delayRef.current);

    // ASC: maintain MAX heap? 
    // If we want sorted Array at end:
    // ASC -> Max Heap -> Swap Max to End -> [ ... Small ... Large ] (Correct)
    // DESC -> Min Heap -> Swap Min to End -> [ ... Large ... Small ] (Correct)

    // Check Left
    // ASC: arr[l] > arr[largest] -> shouldSwap(arr[l], arr[largest])
    if (l < n && shouldSwap(arr[l], arr[largest])) {
      largest = l;
    }

    // Check Right
    if (r < n && shouldSwap(arr[r], arr[largest])) {
      largest = r;
    }

    if (largest !== i) {
      setSwapIndices([i, largest]);
      await sleep(delayRef.current);

      let swap = arr[i];
      arr[i] = arr[largest];
      arr[largest] = swap;
      setNumbers([...arr]);
      metricsRef.current.swaps++; // Swap
      setSwapIndices([]);

      setHeapIndices([]);
      await heapify(arr, n, largest);
    }
    setHeapIndices([]);
  };

  const shakerSort = async () => {
    let arr = [...numbers];
    let start = 0;
    let end = arr.length - 1;
    let swapped = true;
    let sorted = [];

    while (swapped) {
      swapped = false;

      // Forward pass
      for (let i = start; i < end; i++) {
        setCompareIndices([i, i + 1]);
        await sleep(delayRef.current);

        if (shouldSwap(arr[i], arr[i + 1])) {
          setSwapIndices([i, i + 1]);
          await sleep(delayRef.current);

          let temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
          setNumbers([...arr]);
          metricsRef.current.swaps++; // Swap
          setSwapIndices([]);
          swapped = true;
        }
        setCompareIndices([]);
      }

      if (!swapped) break;

      // Mark end as sorted
      sorted.push(end);
      setSortedIndices([...sorted]);
      end--;

      // Backward pass
      swapped = false;
      for (let i = end - 1; i >= start; i--) {
        setCompareIndices([i, i + 1]);
        await sleep(delayRef.current);

        if (shouldSwap(arr[i], arr[i + 1])) {
          setSwapIndices([i, i + 1]);
          await sleep(delayRef.current);

          let temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
          setNumbers([...arr]);
          metricsRef.current.swaps++; // Swap
          setSwapIndices([]);
          swapped = true;
        }
        setCompareIndices([]);
      }

      // Mark start as sorted
      sorted.push(start);
      setSortedIndices([...sorted]);
      start++;
    }
    setSortedIndices(arr.map((_, i) => i));
  };

  const radixSort = async () => {
    let arr = [...numbers];
    const maxNum = Math.max(...arr);
    let digit = 1;

    while (Math.floor(maxNum / digit) > 0) {
      setInfoMessage(`${digit} の位を処理中...`);
      // Distribution phase: colorize based on current digit
      // 0-9 buckets
      let buckets = Array.from({ length: 10 }, () => []);

      // Visualize distribution
      for (let i = 0; i < arr.length; i++) {
        let val = Math.floor((arr[i] / digit) % 10);

        // Update visual state for color
        let currentDigitVals = [...(digitValues.length ? digitValues : new Array(arr.length).fill(-1))];
        currentDigitVals[i] = val;
        setDigitValues(currentDigitVals);

        await sleep(delayRef.current);
        buckets[val].push(arr[i]);
      }

      await sleep(delayRef.current);

      // Collection phase
      arr = [];
      if (sortOrder === 'asc') {
        for (let i = 0; i < 10; i++) {
          arr.push(...buckets[i]);
        }
      } else {
        for (let i = 9; i >= 0; i--) {
          arr.push(...buckets[i]);
        }
      }

      setNumbers([...arr]);
      metricsRef.current.swaps += arr.length; // Count re-writing full array as N swaps
      setDigitValues([]);
      await sleep(delayRef.current);

      digit *= 10;
    }

    setInfoMessage('');
    setSortedIndices(arr.map((_, i) => i));
  };

  const bogoSort = async () => {
    let arr = [...numbers];

    const isSorted = (a) => {
      // Check if all pairs are in correct order
      for (let i = 0; i < a.length - 1; i++) {
        // if shouldSwap(a[i], a[i+1]) is true, they are WRONG order
        if (shouldSwap(a[i], a[i + 1])) return false;
      }
      return true;
    };

    const shuffle = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
        metricsRef.current.swaps++; // Shuffle counts as swaps
      }
      return a;
    };

    while (!isSorted(arr)) {
      setInfoMessage("シャッフル中...");
      arr = shuffle([...arr]);
      setNumbers([...arr]);

      // Flash red on failure (check failed)
      setCompareIndices(arr.map((_, i) => i));
      await sleep(Math.max(delayRef.current, 50));
      setCompareIndices([]);

      if (isSorted(arr)) break;
      await sleep(delayRef.current);
    }
    setInfoMessage("奇跡的に揃いました！");
    setSortedIndices(arr.map((_, i) => i));
  };

  const gnomeSort = async () => {
    let arr = [...numbers];
    let n = arr.length;
    let index = 0;

    while (index < n) {
      setGnomeIndex(index);
      await sleep(delayRef.current);

      if (index === 0) {
        index++;
      } else {
        setCompareIndices([index, index - 1]);
        await sleep(delayRef.current);

        // ASC: arr[index] >= arr[index-1] is GOOD.
        // DESC: arr[index] <= arr[index-1] is GOOD.
        // Bad if shouldSwap(arr[index - 1], arr[index]) -> Left > Right (ASC)
        if (!shouldSwap(arr[index - 1], arr[index])) {
          index++;
        } else {
          setSwapIndices([index, index - 1]);
          await sleep(delayRef.current);

          let temp = arr[index];
          arr[index] = arr[index - 1];
          arr[index - 1] = temp;
          setNumbers([...arr]);
          metricsRef.current.swaps++; // Swap
          setSwapIndices([]);

          index--;
        }
        setCompareIndices([]);
      }
    }
    setGnomeIndex(null);
    setSortedIndices(arr.map((_, i) => i));
  };

  const combSort = async () => {
    let arr = [...numbers];
    let n = arr.length;
    let gap = n;
    let shrink = 1.3;
    let sorted = false;

    while (!sorted) {
      gap = Math.floor(gap / shrink);
      if (gap <= 1) {
        gap = 1;
        sorted = true;
      }

      for (let i = 0; i < n - gap; i++) {
        setCompareIndices([i, i + gap]);
        await sleep(delayRef.current);

        if (shouldSwap(arr[i], arr[i + gap])) {
          setSwapIndices([i, i + gap]);
          await sleep(delayRef.current);

          let temp = arr[i];
          arr[i] = arr[i + gap];
          arr[i + gap] = temp;
          setNumbers([...arr]);
          metricsRef.current.swaps++; // Swap
          setSwapIndices([]);
          sorted = false;
        }
        setCompareIndices([]);
      }
    }
    setSortedIndices(arr.map((_, i) => i));
  };


  // Algorithm Information Data
  const algorithmsInfo = {
    bubble: {
      name: "バブルソート",
      badge: "初級",
      description: "隣り合う要素を比較し、順序が逆であれば入れ替える動作を繰り返す、最も基本的なソートアルゴリズムです。",
      complexity: { avg: "O(n²)", worst: "O(n²)" },
      features: {
        pros: ["実装が非常に簡単", "追加メモリをほぼ必要としない（In-place）", "安定ソートである"],
        cons: ["非常に低速", "要素数が多いと実用的ではない"]
      },
      trivia: "泡（Bubble）のように大きな要素が配列の端へ「浮かび上がっていく」様子から名付けられました。"
    },
    selection: {
      name: "選択ソート",
      badge: "初級",
      description: "未整列の要素から最小値を選び出し、先頭と交換していくシンプルな手法です。",
      complexity: { avg: "O(n²)", worst: "O(n²)" },
      features: {
        pros: ["スワップ回数が少ない（最大 n-1 回）", "実装が簡単", "追加メモリ不要"],
        cons: ["比較回数は常に多い O(n²)", "安定ソートではない", "遅い"]
      },
      trivia: "スワップ操作（データの書き込み）にコストがかかるメモリ環境では、バブルソートなどよりも有利になる場合があります。"
    },
    insertion: {
      name: "挿入ソート",
      badge: "初級",
      description: "整列済みの部分列に対して、新しい要素を適切な位置に挿入していくアルゴリズムです。トランプの手札を整えるのによく似ています。",
      complexity: { avg: "O(n²)", worst: "O(n²)" },
      features: {
        pros: ["データ量が少ない場合は高速", "実装が簡単", "安定ソートである", "ほぼ整列済みのデータに対しては非常に高速"],
        cons: ["データ量が多いと低速"]
      },
      trivia: "データがほぼ整列されている場合、計算量はO(n)に近づき、クイックソートより速くなることもあります。"
    },
    quick: {
      name: "クイックソート",
      badge: "高速",
      description: "「ピボット」と呼ばれる基準値を選び、それより小さいグループと大きいグループに分割（Partition）することを再帰的に繰り返す、高速なアルゴリズムです。",
      complexity: { avg: "O(n log n)", worst: "O(n²)" },
      features: {
        pros: ["一般的なケースで非常に高速", "追加メモリが比較的少なくて済む"],
        cons: ["最悪ケースでは遅くなる", "安定ソートではない", "ピボットの選び方が重要"]
      },
      trivia: "1960年にアントニー・ホーアによって開発されました。実用的なソートライブラリの多くで採用されています。"
    },
    merge: {
      name: "マージソート",
      badge: "複雑",
      description: "リストを半分に分割し続け、それらを整列しながら併合（マージ）していく「分割統治法」を用いたアルゴリズムです。",
      complexity: { avg: "O(n log n)", worst: "O(n log n)" },
      features: {
        pros: ["安定した高速なパフォーマンス", "最悪ケースでも計算量が悪化しない", "安定ソートである"],
        cons: ["追加メモリ領域がO(n)必要", "実装がやや複雑"]
      },
      trivia: "ジョン・フォン・ノイマンによって1945年に考案されました。"
    },
    heap: {
      name: "ヒープソート",
      badge: "複雑",
      description: "配列を「ヒープ」と呼ばれるデータ構造（二分木）に見立て、最大値を取り出して並べていくアルゴリズムです。",
      complexity: { avg: "O(n log n)", worst: "O(n log n)" },
      features: {
        pros: ["追加メモリを必要としない（In-place）", "最悪ケースでもO(n log n)が保証される"],
        cons: ["安定ソートではない", "クイックソートに比べて実際の動作はやや遅いことが多い"]
      },
      trivia: "ウィリアムスによって1964年にヒープデータ構造と共に発表されました。"
    },
    radix: {
      name: "基数ソート",
      badge: "超高速",
      description: "数字の桁ごとにグループ分け（バケツ）して並べる、比較を行わない特殊なアルゴリズムです。",
      complexity: { avg: "O(nk)", worst: "O(nk)" },
      features: {
        pros: ["比較ソートの限界 O(n log n) を超える可能性がある", "安定ソートである"],
        cons: ["データが整数など特定の型に限られる", "大きな桁数のデータでは効率が落ちる"]
      },
      trivia: "かつてパンチカード読み取り機などの物理的なソート機で使われていた歴史ある手法です。"
    },
    shaker: {
      name: "シェーカーソート",
      badge: "初級+",
      description: "バブルソートの改良版です。一方向だけでなく、双方向（行って帰って）に要素をスキャンして整列させます。",
      complexity: { avg: "O(n²)", worst: "O(n²)" },
      features: {
        pros: ["バブルソートより効率的（特にほぼ整列されたデータ）", "実装が比較的容易", "安定ソートである"],
        cons: ["平均・最悪計算量はO(n²)のまま", "大規模データには不向き"]
      },
      trivia: "「カクテルシェーカーソート」とも呼ばれ、シェーカーを振る動きに似ていることが由来です。「ハッピーアワーソート」という別名もあります。"
    },
    bogo: {
      name: "ボゴソート",
      badge: "ジョーク",
      description: "配列をランダムにシャッフルし、偶然揃うのをひたすら待つ運任せのアルゴリズムです。",
      complexity: { avg: "O((n+1)!)", worst: "∞" },
      features: {
        pros: ["実装が非常に簡単", "運が良ければ一瞬で終わる（確率は極めて低い）"],
        cons: ["理論上、永遠に終わらない可能性がある", "最も効率の悪いソートの一つ"]
      },
      trivia: "「無限の猿定理」の実践版。別名「ショットガンソート」や「モンキーソート」とも呼ばれます。使用は推奨されません。"
    },
    gnome: {
      name: "ノームソート",
      badge: "初級",
      description: "庭のノームが鉢植えを並べる方法に基づいたアルゴリズムです。間違いを見つけると、少し戻って修正し、また前に進みます。",
      complexity: { avg: "O(n²)", worst: "O(n²)" },
      features: {
        pros: ["実装が非常にシンプル", "データがほぼ整列されている場合は高速"],
        cons: ["平均・最悪計算量はO(n²)", "行ったり来たりするため動きが遅く見える"]
      },
      trivia: "最初は「Stupid Sort（まぬけソート）」という名前でしたが、後に可愛らしい「ノームソート」に改名されました。"
    },
    comb: {
      name: "コムソート",
      badge: "高速",
      description: "バブルソートの改良版です。亀（末尾の小さな値）を解消するため、櫛でとかすように広い間隔から徐々に狭めて整列させます。",
      complexity: { avg: "O(n log n)", worst: "O(n²)" },
      features: {
        pros: ["バブルソートよりも圧倒的に高速", "実装が比較的簡単"],
        cons: ["安定ソートではない", "最悪計算量はO(n²)のまま"]
      },
      trivia: "収縮率の理想的な値「1.3」は、経験則によって導き出された魔法の数字です。"
    }
  };

  return (
    <div className="h-screen bg-gray-50 text-black flex flex-col md:flex-row font-sans overflow-hidden">

      {/* Left Sidebar - Algorithm Selection */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 h-full">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            ソート<br />可視化
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'sorting' ? 'bg-green-500 animate-pulse' :
              status === 'paused' ? 'bg-yellow-500' :
                status === 'finished' ? 'bg-blue-500' :
                  'bg-gray-300'
              }`}></span>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {status === 'idle' ? '待機中' : status === 'sorting' ? 'ソート中' : status === 'paused' ? '一時停止中' : '完了'}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.entries(algorithmsInfo).map(([key, info]) => (
            <button
              key={key}
              onClick={() => {
                // Always reset when changing algorithm
                handleReset();

                // Bogo Sort UX Safety
                if (key === 'bogo') {
                  previousSizeRef.current = arraySize;
                  setArraySize(5);
                } else if (algorithm === 'bogo' && key !== 'bogo') {
                  setArraySize(previousSizeRef.current);
                }
                setAlgorithm(key);
              }}
              disabled={status === 'sorting' || status === 'paused'}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border ${algorithm === key
                ? "bg-black text-white border-black shadow-md transform scale-[1.02]"
                : "bg-white text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                } ${(status === 'sorting' || status === 'paused') ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">{info.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${algorithm === key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                  {info.badge}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">

            {/* Header / Controls Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">

              {/* Metrics Bar */}
              <div className="flex flex-wrap items-center gap-4 text-sm font-mono bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">経過時間:</span>
                  <span className="font-bold text-lg">
                    {(metrics.elapsed / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">比較回数:</span>
                  <span className="font-bold text-lg">{metrics.comparisons}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">交換回数:</span>
                  <span className="font-bold text-lg">{metrics.swaps}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Top Controls: Speed & Size & Order */}
                <div className="flex gap-8 w-full md:w-auto items-end">
                  {/* ... existing sliders ... */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex justify-between text-sm font-semibold text-gray-500">
                      <label htmlFor="speed">速度</label>
                      <span>{delay}ms</span>
                    </div>
                    <input
                      id="speed"
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={1010 - delay}
                      onChange={(e) => setDelay(1010 - Number(e.target.value))}
                      disabled={false}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex justify-between text-sm font-semibold text-gray-500">
                      <label htmlFor="size">要素数</label>
                      <span>{arraySize}</span>
                    </div>
                    <input
                      id="size"
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={arraySize}
                      onChange={(e) => setArraySize(Number(e.target.value))}
                      disabled={status !== 'idle' && status !== 'finished'}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black disabled:opacity-50"
                    />
                  </div>
                  {/* Sort Order Toggle */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-gray-500">並び順</span>
                    <button
                      onClick={() => {
                        if (status === 'idle' || status === 'finished') {
                          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        }
                      }}
                      disabled={status !== 'idle' && status !== 'finished'}
                      className="h-10 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50 border border-gray-200"
                    >
                      {sortOrder === 'asc' ? '昇順 ⬆' : '降順 ⬇'}
                    </button>
                  </div>
                </div>

                {/* Status Message for Radix */}
                {infoMessage && (
                  <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                    {infoMessage}
                  </div>
                )}


                {/* Action Buttons */}
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={handleReset}
                    // disabled={status === 'sorting'} // Allow reset during sort
                    className="flex-1 md:flex-none px-5 py-2.5 rounded-lg font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors border border-gray-300"
                  >
                    リセット
                  </button>
                  <button
                    onClick={handleSort}
                    disabled={status === 'finished'}
                    className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${status === 'sorting' ? 'bg-yellow-500 hover:bg-yellow-600' :
                      status === 'paused' ? 'bg-green-600 hover:bg-green-700' :
                        status === 'finished' ? 'bg-gray-400 cursor-not-allowed opacity-50' :
                          'bg-black hover:bg-gray-800'
                      }`}
                  >
                    {status === 'sorting' ? (
                      <>
                        <span className="text-lg">⏸</span> 一時停止
                      </>
                    ) : status === 'paused' ? (
                      <>
                        <span className="text-lg">▶</span> 再開
                      </>
                    ) : (
                      <>
                        <span className="text-lg">▶</span> スタート
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Visualization Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 h-96 flex items-end justify-center gap-1">
              {numbers.map((num, index) => {
                let bgColor = "bg-gray-300"; // Lighter default
                if (compareIndices.includes(index)) bgColor = "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]";
                if (swapIndices.includes(index)) bgColor = "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]";
                if (algorithm === 'selection' && minIndices.includes(index)) bgColor = "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]";
                if (pivotIndices.includes(index)) bgColor = "bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]";
                if (heapIndices.includes(index)) bgColor = "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]";
                if (sortedIndices.includes(index)) bgColor = "bg-blue-600";

                // Radix Sort Colors
                if (algorithm === 'radix' && digitValues[index] !== undefined && digitValues[index] !== -1) {
                  const colors = [
                    "bg-red-500", "bg-orange-500", "bg-amber-400", "bg-yellow-300", "bg-lime-400",
                    "bg-green-500", "bg-teal-400", "bg-cyan-400", "bg-blue-500", "bg-violet-500"
                  ];
                  bgColor = colors[digitValues[index]] || "bg-gray-300";
                }

                // Gnome Sort Index
                if (algorithm === 'gnome' && index === gnomeIndex) {
                  bgColor = "bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]";
                }

                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-t-md transition-colors duration-200 ${bgColor}`}
                    style={{ height: `${algorithm === 'radix' ? (num / 10) : num}%` }} // Scale adjustment for 1000
                  ></div>
                );
              })}
            </div>

            {/* Explanation Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-extrabold text-gray-900">{algorithmsInfo[algorithm].name}</h2>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      {algorithmsInfo[algorithm].badge}
                    </span>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {algorithmsInfo[algorithm].description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Complexity */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">時間計算量</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">平均</span>
                        <span className="font-mono font-bold text-lg bg-white px-3 py-1 rounded shadow-sm border border-gray-200 text-blue-600">
                          {algorithmsInfo[algorithm].complexity.avg}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">最悪</span>
                        <span className="font-mono font-bold text-lg bg-white px-3 py-1 rounded shadow-sm border border-gray-200 text-red-600">
                          {algorithmsInfo[algorithm].complexity.worst}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">特徴</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-green-600 mb-2 block">長所</span>
                        <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                          {algorithmsInfo[algorithm].features.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-red-500 mb-2 block">短所</span>
                        <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                          {algorithmsInfo[algorithm].features.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trivia */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 italic flex gap-2">
                    <span className="font-bold not-italic">💡 豆知識</span>
                    {algorithmsInfo[algorithm].trivia}
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main >
    </div >
  );
}

export default App;

