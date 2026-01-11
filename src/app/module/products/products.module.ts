import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductRoutingModule } from './products-routing.module';

@NgModule({
    imports: [
        CommonModule,
        ProductRoutingModule
    ]
})
export class ProductModule { }
