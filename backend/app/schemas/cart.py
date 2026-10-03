from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.product import ProductRead, to_camel


class CartProductRead(ProductRead):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    quantity: int
    size: str


class CartRead(BaseModel):
    items: list[CartProductRead]
    warnings: list[str] = Field(default_factory=list)


class CartAddRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=50)
    size: Annotated[str, StringConstraints(pattern=r"^(XS|S|M|L|XL)$")] = "M"


class CartQuantityRequest(BaseModel):
    quantity: int = Field(ge=1, le=50)
    size: Annotated[str, StringConstraints(pattern=r"^(XS|S|M|L|XL)$")] = "M"


class CartMergeItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=50)
    size: Annotated[str, StringConstraints(pattern=r"^(XS|S|M|L|XL)$")] = "M"


class CartMergeRequest(BaseModel):
    items: list[CartMergeItem] = Field(default_factory=list, max_length=48)
