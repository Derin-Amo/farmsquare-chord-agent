/**
 * Google Apps Script for Farmsquare Chord Agent.
 * Turns your Google Sheet into a live REST API for Products and Abandoned Orders.
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete everything and paste this code.
 * 4. Click Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL (https://script.google.com/macros/s/.../exec).
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "search_products";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "search_products") {
    var query = (e.parameter.query || "").toLowerCase();
    var sheet = ss.getSheetByName("Products");
    if (!sheet) {
      return responseJSON({ success: false, error: "Tab 'Products' not found" });
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var results = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var name = String(row[1] || "").toLowerCase();
      var activeIngredient = String(row[2] || "").toLowerCase();
      
      // Match if query is empty or contained in name or active ingredient
      if (!query || name.indexOf(query) !== -1 || activeIngredient.indexOf(query) !== -1) {
        results.push({
          id: row[0],
          name: row[1],
          active_ingredient: row[2],
          unit_price: row[3],
          carton_price: row[4],
          stock_quantity: row[5],
          in_stock: (Number(row[5]) > 0),
          category: row[6],
          crop_safety: row[7]
        });
      }
    }
    return responseJSON({ success: true, count: results.length, products: results });
  }
  
  if (action === "get_abandoned_orders") {
    var sheet = ss.getSheetByName("Abandoned_Orders");
    if (!sheet) {
      return responseJSON({ success: false, error: "Tab 'Abandoned_Orders' not found" });
    }
    
    var data = sheet.getDataRange().getValues();
    var orders = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      orders.push({
        order_id: row[0],
        customer_name: row[1],
        phone_number: row[2],
        delivery_location: row[3],
        abandoned_items: row[4],
        cart_total_naira: row[5],
        status: row[6],
        abandoned_time: row[7]
      });
    }
    return responseJSON({ success: true, count: orders.length, orders: orders });
  }
  
  return responseJSON({ success: false, error: "Unknown action" });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
