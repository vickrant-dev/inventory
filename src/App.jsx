import { useCallback, useEffect, useState } from 'react';
import './App.css';

// export default function App() {

//     const [form, setForm] = useState({
//         item: '',
//         serialNumber: '',
//         customer: '',
//         invoiceNo: '',
//         invoiceDate: ''
//     })
//     const [inventory, setInventory] = useState([]);
//     const [quantity, setQuantity] = useState(1);

//     const handleInputChange = (e) => {

//         const {name, value} = e.target;
//         setForm((prevForm) => ({...prevForm, [name]: value}));

//     }

//     const handleSubmit = (e) => {

//         e.preventDefault();

//         if (form.item.trim() === "" || form.serialNumber.trim() === "" || form.customer.trim() === "" || form.invoiceDate.trim() === "" || form.invoiceNo.trim() === "") {
//             throw new Error ("Please fill in all the blanks");
//         }

//         try {

//             const serialNumbersArray = form.serialNumber.split(",").map(sn => sn.trim().replace(/[^0-9]/g, ''));
//             const serialNumbersString = form.serialNumber.split(',').map(sn => sn.trim().replace(/[^a-zA-Z]/g, ''));

//             serialNumbersArray.forEach(sn => {
//                 for (let i = 0; i < quantity; i++){
//                     const quantityCount = sn++;
                    
//                     const newForm = serialNumbersArray.map(el => ({
//                         item: form.item,
//                         serialNumber: serialNumbersString + '-' + quantityCount,
//                         customer: form.customer,
//                         invoiceNo: form.invoiceNo,
//                         invoiceDate: form.invoiceDate
//                     }));

//                     const duplicates = newForm.filter((eachItem) => inventory.some((existingItem) => existingItem.serialNumber === eachItem.serialNumber));

//                     if (duplicates.length === 0){
//                         setInventory((prevInventory) => [...prevInventory, ...newForm]);
//                     }
                    
//                     else {
//                         alert('Serial number already exists');
//                     }
                    
//                 }
//             });

//             setForm({
//                 item: '',
//                 serialNumber: '',
//                 customer: '',
//                 invoiceNo: '',
//                 invoiceDate: ''
//             });
//             setQuantity(1); 

//         }

//         catch (error) {
//             console.log(error.message);
//             return;
//         }        

//     }

//     const deleteEntry = (index) => {
//         setInventory((prevInventory) => prevInventory.filter((_, i)=> i !== index));
//     }

//     return (
//         <>
//             <div className="main-container">
//                 <div className="add-information-container">
//                     <h1>Add New Barcode/Serial Number</h1>
//                     <form onSubmit={handleSubmit}>
//                         <label>
//                             <p>Item</p>
//                             <input type="text" name='item' value={form.item} onChange={handleInputChange} />
//                             <p>Quantity</p>
//                             <input type="number" name='quantity' value={quantity} onChange={(e) => setQuantity(e.target.value)}/>
//                         </label>
//                         <label>
//                             <p>Serial Number</p>
//                             <input type="text" name='serialNumber' value={form.serialNumber} onChange={handleInputChange} />
//                         </label>
//                         <label>
//                             <p>Customer</p>
//                             <input type="text" name='customer' value={form.customer} onChange={handleInputChange} />
//                         </label>
//                         <label>
//                             <p>Invoice No</p>
//                             <input type="text" name='invoiceNo' value={form.invoiceNo} onChange={handleInputChange} />
//                         </label>
//                         <label>
//                             <p>Invoice Date</p>
//                             <input type="date" name='invoiceDate' value={form.invoiceDate} onChange={handleInputChange} />
//                         </label>
//                         <div className="submit-btn">
//                             <button type='submit'>Add</button>
//                         </div>
//                     </form>
//                     {/* Find barcode/serial number information */}
//                 </div>
//                 <div className="table-container">
//                     <table border="1">
//                         <thead>
//                             <tr>
//                                 <th>Item</th>
//                                 <th>Serial Number</th>
//                                 <th>Customer</th>
//                                 <th>Invoice No</th>
//                                 <th>Invoice Date</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {inventory.map((data, index) => (
//                                 <tr key={index}>
//                                     <td>{data.item}</td>
//                                     <td>{data.serialNumber}</td>
//                                     <td>{data.customer}</td>
//                                     <td>{data.invoiceNo}</td>
//                                     <td>{data.invoiceDate}</td> <button onClick={() => deleteEntry(index)} >Delete</button>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </>
//     )

// }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://fkpyrnxpyyrruhtgrdwm.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcHlybnhweXlycnVodGdyZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1NjQ5MDYsImV4cCI6MjA1NjE0MDkwNn0.M5fxQbc4wrtNC-BAnvZbgmxZy4eNizfGDEpFSUAKpTU'
);

export default function App() {
    const [form, setForm] = useState({
        item: '',
        serialNumber: '',
        customer: '',
        invoiceNo: '',
        invoiceDate: ''
    });
    const [inventory, setInventory] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [searchSerial, setSearchSerial] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // Fetch inventory from Supabase on load
    useEffect(() => {
        const fetchInventory = async () => {
            const { data, error } = await supabase.from('inventory').select('*');
            if (error) {
                console.error('Error fetching inventory:', error.message);
            } else {
                setInventory(data);
            }
        };
        fetchInventory();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (Object.values(form).some((value) => value.trim() === "")) {
            alert("Please fill in all the blanks.");
            return;
        }
    
        try {
            const serialNumbersArray = form.serialNumber.split(",").map(sn => sn.trim());
    
            let newEntries = [];
    
            // Process each serial number
            for (let serial of serialNumbersArray) {
                // Split by "-" to get the prefix and number
                const parts = serial.split("-");
                if (parts.length !== 2 || isNaN(parts[1])) {
                    alert(`Invalid serial number format: ${serial}`);
                    return;
                }
    
                const prefix = parts[0];  // The alphabetic part (e.g., "CFG" or "B85")
                let baseNumber = parseInt(parts[1], 10); // The numeric part (e.g., "12345")
    
                // Generate quantity number of serial numbers
                for (let i = 0; i < quantity; i++) {
                    const uniqueSerial = `${prefix}-${baseNumber + i}`; // Increment the numeric part
                    newEntries.push({
                        item: form.item,
                        serial_number: uniqueSerial,
                        customer: form.customer,
                        invoice_no: form.invoiceNo,
                        invoice_date: form.invoiceDate
                    });
                }
            }
    
            // Check if serial numbers already exist in Supabase
            const { data: existingData, error: fetchError } = await supabase
                .from('inventory')
                .select('serial_number')
                .in('serial_number', newEntries.map(entry => entry.serial_number));
    
            if (fetchError) {
                console.error('Error fetching existing serial numbers:', fetchError.message);
                return;
            }
    
            // Convert existing serial numbers into a Set for quick lookup
            const existingSerials = new Set(existingData.map(item => item.serial_number));
    
            // Filter out already existing serial numbers
            newEntries = newEntries.filter(entry => !existingSerials.has(entry.serial_number));
    
            if (newEntries.length === 0) {
                alert("All serial numbers already exist. No new entries were added.");
                return;
            }
    
            // Insert only unique serial numbers into Supabase
            const { data, error } = await supabase.from('inventory').insert(newEntries).select();
    
            if (error) {
                console.error('Error inserting data:', error.message);
                alert("Error adding entry. Ensure serial numbers are unique.");
            } else {
                setInventory([...inventory, ...data]);
                setForm({ item: '', serialNumber: '', customer: '', invoiceNo: '', invoiceDate: '' });
                setQuantity(1);
            }
        } catch (error) {
            console.error('Submission Error:', error.message);
        }
    };

    // Check handleSubmit code and backupLast50CSV

    const deleteEntry = async (id) => {
        const { error } = await supabase.from('inventory').delete().eq('id', id);

        if (error) {
            console.error('Error deleting:', error.message);
            alert('Could not delete entry.');
        } else {
            setInventory((prevInventory) => prevInventory.filter((item) => item.id !== id));
        }
    };

    const handleSearch = async () => {
        if (!searchSerial.trim()) {
            setSearchResult(null);
            return;
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('serial_number', searchSerial.trim());

        if (error) {
            console.error('Error searching for serial number:', error.message);
        } else {
            setSearchResult(data.length > 0 ? data[0] : null);
        }
    };

    const backupLast50CSV = () => {
        const last50Entries = inventory.slice(-50);
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Item,Serial Number,Customer,Invoice No,Invoice Date\n";  // CSV headers
    
        last50Entries.forEach(row => {
            csvContent += `${row.item},${row.serial_number},${row.customer},${row.invoice_no},${row.invoice_date}\n`;
        });
    
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_backup.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="main-container">
                {/* Add new inventory */}
                <div className="add-information-container">
                    <h1>Enter Product Information 📄</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="input-container">
                            <label>
                                <p>Item</p>
                                <input type="text" name='item' placeholder='Item name...' value={form.item} onChange={handleInputChange} />
                            </label>
                            <label>
                                <p>Quantity</p>
                                <input type="number" name='quantity' value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                            </label>
                            <label>
                                <p>Serial Number</p>
                                <input type="text" name='serialNumber' value={form.serialNumber} placeholder='Serial number...' onChange={handleInputChange} />
                            </label>
                            <label>
                                <p>Customer</p>
                                <input type="text" name='customer' value={form.customer} placeholder='Customer...' onChange={handleInputChange} />
                            </label>
                            <label>
                                <p>Invoice No</p>
                                <input type="text" name='invoiceNo' value={form.invoiceNo} placeholder='Invoice number...' onChange={handleInputChange} />
                            </label>
                            <label>
                                <p>Invoice Date</p>
                                <input type="date" name='invoiceDate' value={form.invoiceDate} onChange={handleInputChange} />
                            </label>
                        </div>
                        <div className="submit-btn">
                            <button type='submit'>Add</button>
                        </div>
                    </form>
                </div>

                {/* Lookup Function */}
                <div className="lookup-container">
                    <h1>Lookup Serial Number 🔎</h1>
                    <input
                        type="text"
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        placeholder="Enter serial number"
                    />
                    <button onClick={handleSearch}>Search</button>
                    {searchResult ? (
                        <div className='search-results'>
                            <h3>Details for {searchResult.serial_number}</h3>
                            <p><strong>Item:</strong> {searchResult.item}</p>
                            <p className="search-customer"><strong>Customer:</strong> {searchResult.customer}</p>
                            <p><strong>Invoice No:</strong> {searchResult.invoice_no}</p>
                            <p><strong>Invoice Date:</strong> {searchResult.invoice_date}</p>
                        </div>
                    ) : searchSerial && (
                        <p className='search-error'>No result found for {searchSerial}</p>
                    )}
                </div>

                {/* Display inventory */}
                <div className="table-container">
                    <h4>All Products 📦</h4>
                    <div className="tb-info-row">
                        <p className='total-products'>Total Entries: {inventory.length}</p>
                        <button onClick={backupLast50CSV}>Backup (CSV)</button>
                    </div>
                    <table border="1">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Serial Number</th>
                                <th>Customer</th>
                                <th>Invoice No</th>
                                <th>Invoice Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.slice(-25).map((data) => (
                                <tr key={data.id}>
                                    <td>{data.item}</td>
                                    <td>{data.serial_number}</td>
                                    <td>{data.customer}</td>
                                    <td>{data.invoice_no}</td>
                                    <td>{data.invoice_date}</td>
                                    <td><button className='del-btn' onClick={() => deleteEntry(data.id)}>Delete</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </>
    );
}