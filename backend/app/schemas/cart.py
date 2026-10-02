from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductRead, to_camel


class CartProductRead(ProductRead):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    quantity: int


class CartRead(BaseModel):
    items: list[CartProductRead]
    warnings: list[str] = Field(default_factory=list)


class CartAddRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=50)


class CartQuantityRequest(BaseModel):
    quantity: int = Field(ge=1, le=50)


class CartMergeItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=50)


class CartMergeRequest(BaseModel):
    items: list[CartMergeItem] = Field(default_factory=list, max_length=48)
