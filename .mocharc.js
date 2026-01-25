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

module.exports = {
  // Specify test files pattern
  spec: 'test/**/*.test.js',
  
  // Require setup file before running tests
  require: ['test/setup.js'],
  
  // Set timeout for tests
  timeout: 5000,
  
  // Show colors in output
  color: true,
  
  // Report tests in a more verbose way
  reporter: 'spec',
  
  // Exit after tests complete
  exit: true
};