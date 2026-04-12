import { Injectable } from '@angular/core';
import { ModuleRegistry, ClientSideRowModelModule, TooltipModule, ValidationModule, CellStyleModule } from 'ag-grid-community';

@Injectable({
  providedIn: 'root',
})
export class AgGridInitializerService {

  constructor() {
    console.log('AgGridInitializerService: Initializing core AG-Grid modules...');

    // Register all necessary modules once at application bootstrap
    ModuleRegistry.registerModules([
      ClientSideRowModelModule,
      CellStyleModule,
      TooltipModule,
      ValidationModule
    ]);

    console.log('AgGridInitializerService: Initialization complete.');
  }
}