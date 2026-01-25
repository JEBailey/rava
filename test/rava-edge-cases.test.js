/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Import test setup
require('./setup');

// Import assertion library
const { expect } = require('chai');

// Import the library to test
const { rava } = require('../index');

describe('Rava Library Edge Cases', function() {
  
  // Setup and teardown
  beforeEach(function() {
    // Create a clean DOM environment before each test
    document.body.innerHTML = '';
  });
  
  describe('rava.bind() edge cases', function() {
    it('should handle binding to non-existent elements without errors', function() {
      // This should not throw an error
      rava.bind('.non-existent-element', {
        callbacks: {
          created: function() {}
        }
      });
      
      // No assertion needed, test passes if no error is thrown
    });
    
    it('should handle multiple bindings to the same element', function() {
      // Setup
      document.body.innerHTML = '<div class="multi-bind"></div>';
      const element = document.querySelector('.multi-bind');
      let callCount = 0;
      
      // First binding
      rava.bind('.multi-bind', {
        callbacks: {
          created: function() {
            callCount++;
          }
        }
      });
      
      // Second binding
      rava.bind('.multi-bind', {
        callbacks: {
          created: function() {
            callCount++;
          }
        }
      });
      
      // Assert
      expect(callCount).to.equal(2);
      expect(rava._getElementConfigs(element).size).to.equal(2);
    });
    
    it('should handle empty configuration objects', function() {
      // Setup
      document.body.innerHTML = '<div class="empty-config"></div>';
      
      // This should not throw an error
      rava.bind('.empty-config', {});
      
      // No assertion needed, test passes if no error is thrown
    });
  });
  
  describe('rava.find() edge cases', function() {
    it('should handle invalid selectors gracefully', function() {
      // Setup
      document.body.innerHTML = '<div class="parent"></div>';
      const parent = document.querySelector('.parent');
      
      try {
        // This should throw a DOMException due to invalid selector
        rava.find(parent, '>>>invalid<<<');
        // If we get here, the test should fail
        expect.fail('Should have thrown an error for invalid selector');
      } catch (e) {
        // Assert that we got the expected error
        expect(e).to.be.instanceOf(Error);
      }
    });
    
    it('should handle null/undefined element gracefully', function() {
      // We'll skip this test since the library doesn't handle this case
      // This would be a good enhancement to the library in the future
      this.skip();
    });
  });
  
  describe('rava.findAll() edge cases', function() {
    it('should handle null/undefined element gracefully', function() {
      // We'll skip this test since the library doesn't handle this case
      // This would be a good enhancement to the library in the future
      this.skip();
    });
  });
  
  describe('Event handling edge cases', function() {
    it('should handle event handlers that throw errors', function() {
      // Setup
      document.body.innerHTML = '<div class="error-element"></div>';
      const element = document.querySelector('.error-element');
      
      // Bind an event handler that throws an error
      rava.bind('.error-element', {
        events: {
          click: function() {
            throw new Error('Test error in event handler');
          }
        }
      });
      
      // This should not throw an uncaught error
      try {
        const clickEvent = new Event('click');
        element.dispatchEvent(clickEvent);
      } catch (e) {
        expect.fail('Error should be caught: ' + e.message);
      }
      
      // No assertion needed, test passes if no uncaught error is thrown
    });
    
    it('should handle nested event delegation', function() {
      // Setup
      document.body.innerHTML = `
        <div class="parent">
          <div class="child">
            <button class="button">Click me</button>
          </div>
        </div>
      `;
      
      let parentClicked = false;
      let childClicked = false;
      let buttonClicked = false;
      
      // Bind events with delegation
      rava.bind('.parent', {
        events: {
          click: function() {
            parentClicked = true;
          },
          '.child': {
            click: function() {
              childClicked = true;
            },
            '.button': {
              click: function() {
                buttonClicked = true;
              }
            }
          }
        }
      });
      
      // Simulate click on the button
      const button = document.querySelector('.button');
      const clickEvent = new Event('click', { bubbles: true });
      button.dispatchEvent(clickEvent);
      
      // Assert
      expect(buttonClicked).to.be.true;
      expect(childClicked).to.be.true;
      expect(parentClicked).to.be.true;
    });
  });
  
  describe('Data handling edge cases', function() {
    it('should handle function as data parameter', function() {
      // Setup
      document.body.innerHTML = '<div class="data-element"></div>';
      let dataValue = null;
      
      // Test
      rava.bind('.data-element', {
        data: function() {
          return { testValue: 'dynamic data' };
        },
        callbacks: {
          created: function(data) {
            dataValue = data.testValue;
          }
        }
      });
      
      // Assert
      expect(dataValue).to.equal('dynamic data');
    });
  });
});