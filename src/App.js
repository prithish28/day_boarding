import React, { useState, useEffect, useRef, useCallback } from 'react';
import supabase from './supabaseClient';
import './App.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function App() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus on the input when the component mounts
    inputRef.current.focus();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      let { data: existingData, error: existError } = await supabase
        .from('attendance_exist')
        .select('*')
        .eq('adm_no', barcodeInput);

      if (existError) {
        throw existError;
      }

      if (existingData.length > 0) {
        const { adm_no, name, class_sec } = existingData[0];
        await supabase
          .from('attendance_new')
          .insert([{ adm_no, name, class_sec, timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    setBarcodeInput('');
    inputRef.current.focus(); // Refocus the input field
  }, [barcodeInput]);

  useEffect(() => {
    // If barcodeInput length matches expected length, automatically save data
    const expectedLength = 8; // Assuming admission number length is 8, adjust as needed
    if (barcodeInput.length === expectedLength) {
      handleSave();
    }
  }, [barcodeInput, handleSave]);

  const handleBarcodeInput = (event) => {
    const { key } = event;

    // Allow only numeric digits and handle backspace
    if (/^[0-9\b]+$/.test(key)) {
      if (key === 'Backspace') {
        setBarcodeInput(prev => prev.slice(0, -1)); // Remove the last character
      } else {
        setBarcodeInput(prev => prev + key);
      }
    }

    // Prevent default behavior for numeric keys to avoid double input
    if (/^[0-9]+$/.test(key)) {
      event.preventDefault();
    }
  };

  const handleDownload = async () => {
    try {
      let { data, error } = await supabase
        .from('attendance_new')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) {
        throw error;
      }

      if (data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        saveAs(blob, 'attendance_new.xlsx');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Day Boaarding Attendance</h1>
        <input 
          type="text" 
          className="barcode-input"
          placeholder="Scan barcode here"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleBarcodeInput}
          ref={inputRef} // Assign the ref to the input element
        />
        <div className="date-picker">
          <DatePicker 
            selected={startDate}
            onChange={date => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
          />
          <DatePicker 
            selected={endDate}
            onChange={date => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
          />
        </div>
        <button onClick={handleDownload} className="download-button">
          Download Attendance
        </button>
      </header>
    </div>
  );
}

export default App;
